from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models, transaction
from django.core.cache import cache
from core.throttles import SpellImportRateThrottle
from core.cache_utils import (
    spell_detail_key, spell_counts_key,
    invalidate_spell_counts, invalidate_spell_counts_and_detail,
    SPELL_DETAIL_TTL, SPELL_COUNTS_TTL,
)
from .models import Spell, DamageComponent
from .serializers import (
    SpellListSerializer,
    SpellDetailSerializer,
    SpellCreateUpdateSerializer,
    SpellImportSerializer,
    SpellExportSerializer,
    DamageComponentSerializer
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
    filterset_fields = ['level', 'school', 'is_attack_roll', 'is_saving_throw', 'concentration', 'ritual']
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

        # Optional class filter: ?class_name=wizard
        class_name = self.request.query_params.get('class_name')
        if class_name:
            queryset = queryset.filter(classes__contains=[class_name.lower()])

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user, is_custom=True)
        if self.request.user.is_authenticated:
            invalidate_spell_counts(self.request.user.id)

    def perform_update(self, serializer):
        instance = serializer.save()
        cache.delete(spell_detail_key(instance.id, instance.updated_at))
        if instance.created_by_id:
            invalidate_spell_counts(instance.created_by_id)

    def perform_destroy(self, instance):
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
        auto_parse = serializer.validated_data['auto_parse']
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
                    # Override source with what the user provided
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
