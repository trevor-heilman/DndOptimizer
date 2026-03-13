from django.core.cache import cache
from django.db import models, transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.cache_utils import (
    SPELL_COUNTS_TTL,
    SPELL_DETAIL_TTL,
    invalidate_spell_counts,
    spell_counts_key,
    spell_detail_key,
)
from core.throttles import SpellImportRateThrottle

from .models import DamageComponent, Spell
from .serializers import (
    DamageComponentSerializer,
    SpellCreateUpdateSerializer,
    SpellDetailSerializer,
    SpellExportSerializer,
    SpellImportSerializer,
    SpellListSerializer,
)
from .services import SpellParsingService


class SpellPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000


class SpellViewSet(viewsets.ModelViewSet):
    """
    ViewSet for spell CRUD operations.
    """
    queryset = Spell.objects.all().prefetch_related('damage_components', 'parsing_metadata')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = SpellPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_attack_roll', 'is_saving_throw', 'concentration', 'ritual']
    search_fields = ['name', 'description', 'source']
    ordering_fields = ['name', 'level', 'created_at']
    ordering = ['level', 'name']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return SpellListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SpellCreateUpdateSerializer
        elif self.action == 'export':
            return SpellExportSerializer
        return SpellDetailSerializer

    def get_queryset(self):
        """Filter spells - show all public + user's custom spells."""
        queryset = self.queryset

        if self.request.user.is_authenticated:
            # Show all non-custom spells + user's custom spells
            queryset = queryset.filter(
                models.Q(is_custom=False) | models.Q(created_by=self.request.user)
            )
        else:
            # Show only non-custom spells
            queryset = queryset.filter(is_custom=False)

        # Optional class filter: ?class_name=wizard&class_name=sorcerer (OR logic)
        class_names = self.request.query_params.getlist('class_name')
        if class_names:
            q = models.Q()
            for cn in class_names:
                q |= models.Q(classes__contains=[cn.lower()])
            queryset = queryset.filter(q)

        # Optional tag filter: ?tag=damage&tag=aoe (OR logic)
        tags = self.request.query_params.getlist('tag')
        if tags:
            q = models.Q()
            for t in tags:
                q |= models.Q(tags__contains=[t.lower()])
            queryset = queryset.filter(q)

        # Multi-value level filter: ?level=1&level=3
        levels = self.request.query_params.getlist('level')
        if levels:
            try:
                queryset = queryset.filter(level__in=[int(level_str) for level_str in levels])
            except (ValueError, TypeError):
                pass

        # Multi-value school filter: ?school=evocation&school=necromancy
        schools = self.request.query_params.getlist('school')
        if schools:
            queryset = queryset.filter(school__in=schools)

        # Multi-value source filter: ?source=PHB&source=XGTE
        sources = self.request.query_params.getlist('source')
        if sources:
            queryset = queryset.filter(source__in=sources)

        # Multi-value damage_type filter: ?damage_type=fire&damage_type=cold
        damage_types = self.request.query_params.getlist('damage_type')
        if damage_types:
            queryset = queryset.filter(damage_components__damage_type__in=damage_types).distinct()

        # Optional component filters: ?has_v=true, ?has_s=true, ?has_m=true
        for param, field in (('has_v', 'components_v'), ('has_s', 'components_s'), ('has_m', 'components_m')):
            val = self.request.query_params.get(param)
            if val is not None:
                queryset = queryset.filter(**{field: val.lower() == 'true'})

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user, is_custom=True)
        if self.request.user.is_authenticated:
            invalidate_spell_counts(self.request.user.id)

    def perform_update(self, serializer):
        original = serializer.instance
        if not self.request.user.is_staff and original.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit spells you created.')
        instance = serializer.save()
        cache.delete(spell_detail_key(instance.id, instance.updated_at))
        if instance.created_by_id:
            invalidate_spell_counts(instance.created_by_id)

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete spells you created.')
        key = spell_detail_key(instance.id, instance.updated_at)
        user_id = instance.created_by_id
        instance.delete()
        cache.delete(key)
        if user_id:
            invalidate_spell_counts(user_id)

    def retrieve(self, request, *args, **kwargs):
        """Return a spell, served from cache when available."""
        instance = self.get_object()
        ck = spell_detail_key(instance.id, instance.updated_at)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)
        serializer = self.get_serializer(instance)
        data = serializer.data
        cache.set(ck, data, SPELL_DETAIL_TTL)
        return Response(data)

    @action(detail=False, methods=['get'])
    def spell_counts(self, request):
        """
        Return spell counts per delete category for the current user.
        GET /api/spells/spells/spell_counts/
        """
        if not request.user.is_authenticated:
            return Response(
                {'system': 0, 'imported': 0, 'custom': 0},
                status=status.HTTP_200_OK
            )
        ck = spell_counts_key(request.user.id)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)
        system = Spell.objects.filter(is_custom=False, created_by__isnull=True).count()
        imported = Spell.objects.filter(is_custom=False, created_by=request.user).count()
        custom = Spell.objects.filter(is_custom=True, created_by=request.user).count()
        data = {'system': system, 'imported': imported, 'custom': custom}
        cache.set(ck, data, SPELL_COUNTS_TTL)
        return Response(data)

    @action(detail=False, methods=['get'])
    def sources(self, request):
        """
        Return sorted list of distinct non-empty source values visible to
        the current user.
        GET /api/spells/spells/sources/
        """
        qs = self.get_queryset().exclude(source='')
        source_list = sorted(set(qs.values_list('source', flat=True).distinct()))
        return Response(source_list)

    @action(detail=False, methods=['post'], throttle_classes=[SpellImportRateThrottle])
    def import_spells(self, request):
        """
        Bulk import spells from JSON.
        POST /api/spells/import_spells/
        Body fields:
          spells      – list of spell objects (required)
          source      – source label string
          auto_parse  – bool
          is_system   – bool, staff only; marks spells as non-custom with no owner
        """
        serializer = SpellImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        spells_data = serializer.validated_data['spells']
        source = serializer.validated_data['source']
        is_system = bool(request.data.get('is_system', False))

        if is_system and not request.user.is_staff:
            return Response(
                {'error': 'Staff access required to import system spells'},
                status=status.HTTP_403_FORBIDDEN
            )

        imported_spells = []
        failed_spells = []

        for spell_data in spells_data:
            try:
                with transaction.atomic():
                    parsed = SpellParsingService.parse_spell_data(dict(spell_data))
                    # Only override source when the caller explicitly provided one;
                    # otherwise keep whatever the JSON data contains.
                    if source:
                        parsed['normalized_data']['source'] = source
                    spell = SpellParsingService.create_spell_from_parsed_data(
                        parsed,
                        created_by=None if is_system else (request.user if request.user.is_authenticated else None)
                    )
                    if not is_system:
                        # Mark user-imported spells as non-custom (visible to all) but owned
                        spell.is_custom = False
                        spell.save(update_fields=['is_custom'])
                    imported_spells.append(spell)
            except Exception as e:
                failed_spells.append({
                    'name': spell_data.get('name') or spell_data.get('Name', 'Unknown'),
                    'error': str(e)
                })

        # Invalidate spell counts after bulk import
        if imported_spells and request.user.is_authenticated:
            invalidate_spell_counts(request.user.id)

        return Response({
            'imported': len(imported_spells),
            'failed': len(failed_spells),
            'spells': SpellListSerializer(imported_spells, many=True).data,
            'errors': failed_spells
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """
        Export a single spell to JSON.
        GET /api/spells/{id}/export/
        """
        spell = self.get_object()
        serializer = SpellExportSerializer(spell)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a custom copy of any spell owned by the requesting user.
        POST /api/spells/{id}/duplicate/
        """
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        original = self.get_object()
        new_spell = Spell.objects.create(
            name=f"{original.name} (Copy)",
            level=original.level,
            school=original.school,
            casting_time=original.casting_time,
            range=original.range,
            duration=original.duration,
            concentration=original.concentration,
            ritual=original.ritual,
            is_attack_roll=original.is_attack_roll,
            is_saving_throw=original.is_saving_throw,
            save_type=original.save_type,
            half_damage_on_save=original.half_damage_on_save,
            number_of_attacks=original.number_of_attacks,
            crit_enabled=original.crit_enabled,
            aoe_radius=original.aoe_radius,
            damage_type=original.damage_type,
            upcast_base_level=original.upcast_base_level,
            upcast_dice_increment=original.upcast_dice_increment,
            upcast_die_size=original.upcast_die_size,
            components_v=original.components_v,
            components_s=original.components_s,
            components_m=original.components_m,
            material=original.material,
            source=original.source,
            is_custom=True,
            description=original.description,
            higher_level=original.higher_level,
            classes=list(original.classes),
            tags=list(original.tags),
            raw_data=dict(original.raw_data),
            created_by=request.user,
        )
        for dc in original.damage_components.all():
            DamageComponent.objects.create(
                spell=new_spell,
                dice_count=dc.dice_count,
                die_size=dc.die_size,
                flat_modifier=dc.flat_modifier,
                damage_type=dc.damage_type,
                timing=dc.timing,
                on_crit_extra=dc.on_crit_extra,
                scales_with_slot=dc.scales_with_slot,
                is_verified=False,
            )
        invalidate_spell_counts(request.user.id)
        serializer = SpellDetailSerializer(new_spell, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete spells by category.
        POST /api/spells/spells/bulk_delete/
        Body: { "categories": ["system", "imported", "custom"] }
          - system:   non-custom spells seeded by admin (staff only)
          - imported: non-custom spells imported by the current user
          - custom:   custom spells created by the current user
        """
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        categories = request.data.get('categories', [])
        valid = {'system', 'imported', 'custom'}
        invalid = set(categories) - valid
        if invalid:
            return Response(
                {'error': f'Invalid categories: {list(invalid)}. Valid: system, imported, custom'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not categories:
            return Response(
                {'error': 'Provide at least one category'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted = 0

        if 'system' in categories:
            if not request.user.is_staff:
                return Response(
                    {'error': 'Staff access required to delete system spells'},
                    status=status.HTTP_403_FORBIDDEN
                )
            count, _ = Spell.objects.filter(is_custom=False, created_by__isnull=True).delete()
            deleted += count

        if 'imported' in categories:
            count, _ = Spell.objects.filter(is_custom=False, created_by=request.user).delete()
            deleted += count

        if 'custom' in categories:
            count, _ = Spell.objects.filter(is_custom=True, created_by=request.user).delete()
            deleted += count

        return Response({'deleted': deleted}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def export_multiple(self, request):
        """
        Export multiple spells to JSON.
        POST /api/spells/export_multiple/
        Body: { "spell_ids": ["uuid1", "uuid2", ...] }
        """
        spell_ids = request.data.get('spell_ids', [])

        if not spell_ids:
            return Response(
                {'error': 'spell_ids required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        spells = self.get_queryset().filter(id__in=spell_ids)
        serializer = SpellExportSerializer(spells, many=True)

        return Response({
            'spells': serializer.data,
            'count': len(serializer.data)
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def needs_review(self, request):
        """
        Return spells flagged for admin review (requires_review=True).
        Results are ordered by confidence ascending (lowest first).
        GET /api/spells/spells/needs_review/
        """
        queryset = (
            Spell.objects
            .filter(parsing_metadata__requires_review=True)
            .prefetch_related('damage_components', 'parsing_metadata')
            .order_by('parsing_metadata__parsing_confidence', 'name')
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SpellDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SpellDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def mark_reviewed(self, request, pk=None):
        """
        Mark a spell's parsing metadata as reviewed by the current admin.
        POST /api/spells/spells/{id}/mark_reviewed/
        """
        from django.utils import timezone
        spell = self.get_object()
        metadata = getattr(spell, 'parsing_metadata', None)
        if metadata is None:
            return Response({'error': 'No parsing metadata found'}, status=status.HTTP_400_BAD_REQUEST)
        metadata.requires_review = False
        metadata.reviewed_by = request.user
        metadata.reviewed_at = timezone.now()
        metadata.save(update_fields=['requires_review', 'reviewed_by', 'reviewed_at'])
        # Invalidate cached detail so next fetch reflects the updated metadata
        cache.delete(spell_detail_key(spell.id, spell.updated_at))
        return Response({'status': 'reviewed'})


class DamageComponentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for damage component management.
    """
    queryset = DamageComponent.objects.all()
    serializer_class = DamageComponentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Filter damage components by spell if specified."""
        queryset = self.queryset
        spell_id = self.request.query_params.get('spell_id')

        if spell_id:
            queryset = queryset.filter(spell_id=spell_id)

        return queryset
