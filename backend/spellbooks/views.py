from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from .models import Character, Spellbook, PreparedSpell
from .serializers import (
    CharacterSerializer,
    CharacterCreateUpdateSerializer,
    UpdateSpellSlotsSerializer,
    SpellbookListSerializer,
    SpellbookDetailSerializer,
    SpellbookCreateUpdateSerializer,
    AddSpellToSpellbookSerializer,
    UpdatePreparedSpellSerializer,
    SpellbookExportSerializer,
    ReorderSpellbooksSerializer,
)
from .services import calculate_copy_cost


class CharacterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for character CRUD and spell-slot tracking.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    def get_queryset(self):
        qs = Character.objects.annotate(
            spellbook_count=Count('spellbooks', distinct=True),
        ).select_related('owner')
        if self.request.user.is_staff:
            return qs
        return qs.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CharacterCreateUpdateSerializer
        return CharacterSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['patch'], url_path='spell_slots')
    def update_spell_slots(self, request, pk=None):
        """
        PATCH /api/characters/{id}/spell_slots/
        Body: {"spell_slots_used": [0,1,0,0,0,0,0,0,0]}
        """
        character = self.get_object()
        serializer = UpdateSpellSlotsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        character.spell_slots_used = serializer.validated_data['spell_slots_used']
        character.save(update_fields=['spell_slots_used', 'updated_at'])
        return Response(CharacterSerializer(character).data)

    @action(detail=True, methods=['post'], url_path='reset_slots')
    def reset_spell_slots(self, request, pk=None):
        """
        POST /api/characters/{id}/reset_slots/
        Resets all spell_slots_used to 0 (long rest).
        """
        character = self.get_object()
        character.spell_slots_used = [0] * 9
        character.save(update_fields=['spell_slots_used', 'updated_at'])
        return Response(CharacterSerializer(character).data)

    @action(detail=True, methods=['get'], url_path='spells')
    def all_spells(self, request, pk=None):
        """
        GET /api/characters/{id}/spells/
        Returns all prepared spells across every spellbook owned by this character.
        """
        character = self.get_object()
        # Aggregate all PreparedSpell rows across this character's spellbooks
        prepared_spells = (
            PreparedSpell.objects
            .filter(spellbook__character=character)
            .select_related('spell', 'spellbook')
            .order_by('spell__level', 'spell__name')
        )
        from .serializers import PreparedSpellSerializer as PS
        data = []
        for ps in prepared_spells:
            row = PS(ps).data
            row['spellbook_name'] = ps.spellbook.name
            row['spellbook_id'] = str(ps.spellbook.id)
            data.append(row)
        return Response(data)


class SpellbookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for spellbook CRUD operations.
    """
    queryset = Spellbook.objects.all().select_related('owner').prefetch_related('prepared_spells__spell')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return SpellbookListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SpellbookCreateUpdateSerializer
        elif self.action == 'export':
            return SpellbookExportSerializer
        return SpellbookDetailSerializer

    def get_queryset(self):
        """Users can only see their own spellbooks."""
        qs = self.queryset.annotate(
            spell_count=Count('prepared_spells', distinct=True),
            prepared_spell_count=Count(
                'prepared_spells',
                filter=Q(prepared_spells__prepared=True),
                distinct=True,
            )
        )
        if self.request.user.is_staff:
            return qs
        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def add_spell(self, request, pk=None):
        """
        Add a spell to this spellbook.
        POST /api/spellbooks/{id}/add_spell/
        """
        spellbook = self.get_object()
        serializer = AddSpellToSpellbookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if spell already in spellbook
        spell_id = serializer.validated_data['spell_id']
        if PreparedSpell.objects.filter(spellbook=spellbook, spell_id=spell_id).exists():
            return Response(
                {'error': 'Spell already in spellbook'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add spell to spellbook
        prepared_spell = PreparedSpell.objects.create(
            spellbook=spellbook,
            spell_id=spell_id,
            prepared=serializer.validated_data['prepared'],
            notes=serializer.validated_data['notes']
        )
        
        return Response(
            SpellbookDetailSerializer(spellbook).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['delete'])
    def remove_spell(self, request, pk=None):
        """
        Remove a spell from this spellbook.
        DELETE /api/spellbooks/{id}/remove_spell/?spell_id={uuid}
        """
        spellbook = self.get_object()
        spell_id = request.query_params.get('spell_id')
        
        if not spell_id:
            return Response(
                {'error': 'spell_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            prepared_spell = PreparedSpell.objects.get(
                spellbook=spellbook,
                spell_id=spell_id
            )
            prepared_spell.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PreparedSpell.DoesNotExist:
            return Response(
                {'error': 'Spell not in spellbook'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['patch'])
    def update_prepared_spell(self, request, pk=None):
        """
        Update a prepared spell's status or notes.
        PATCH /api/spellbooks/{id}/update_prepared_spell/?spell_id={uuid}
        """
        spellbook = self.get_object()
        spell_id = request.query_params.get('spell_id')
        
        if not spell_id:
            return Response(
                {'error': 'spell_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            prepared_spell = PreparedSpell.objects.get(
                spellbook=spellbook,
                spell_id=spell_id
            )
        except PreparedSpell.DoesNotExist:
            return Response(
                {'error': 'Spell not in spellbook'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdatePreparedSpellSerializer(
            prepared_spell,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(SpellbookDetailSerializer(spellbook).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """
        Export spellbook to JSON.
        GET /api/spellbooks/{id}/export/
        """
        spellbook = self.get_object()
        serializer = SpellbookExportSerializer(spellbook)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a spellbook.
        POST /api/spellbooks/{id}/duplicate/
        """
        original = self.get_object()
        
        # Create new spellbook
        new_spellbook = Spellbook.objects.create(
            name=f"{original.name} (Copy)",
            description=original.description,
            owner=request.user
        )
        
        # Copy all prepared spells
        for prepared_spell in original.prepared_spells.all():
            PreparedSpell.objects.create(
                spellbook=new_spellbook,
                spell=prepared_spell.spell,
                prepared=prepared_spell.prepared,
                notes=prepared_spell.notes
            )
        
        return Response(
            SpellbookDetailSerializer(new_spellbook).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        POST /api/spellbooks/reorder/
        Body: {"items": [{"id": "uuid", "sort_order": 0}, ...]}
        Bulk-updates sort_order for the caller's spellbooks.
        """
        serializer = ReorderSpellbooksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data['items']
        # Fetch all referenced books and verify ownership
        ids = [item['id'] for item in items]
        books = {str(sb.id): sb for sb in Spellbook.objects.filter(id__in=ids, owner=request.user)}
        for item in items:
            sb = books.get(str(item['id']))
            if sb:
                sb.sort_order = item['sort_order']
        Spellbook.objects.bulk_update(list(books.values()), ['sort_order'])
        return Response({'updated': len(books)})

    @action(detail=True, methods=['get'], url_path='copy_cost')
    def copy_cost(self, request, pk=None):
        """
        GET /api/spellbooks/{id}/copy_cost/
        Returns the gold and time cost to copy this spellbook into a new one.
        Pass ?character_id=<uuid> to apply that character's subclass/school discounts.
        """
        spellbook = self.get_object()
        character = None
        character_id = request.query_params.get('character_id')
        if character_id:
            try:
                character = Character.objects.get(pk=character_id, owner=request.user)
            except Character.DoesNotExist:
                pass
        elif spellbook.character_id:
            character = spellbook.character

        result = calculate_copy_cost(spellbook, character)
        return Response({
            'total_gold': result.total_gold,
            'total_hours': result.total_hours,
            'scribes_discount_applied': result.scribes_discount_applied,
            'school_discounts_applied': result.school_discounts_applied,
            'spell_entries': [
                {
                    'name': e.name,
                    'level': e.level,
                    'school': e.school,
                    'gold_cost': e.gold_cost,
                    'time_hours': e.time_hours,
                    'discount_pct': e.discount_pct,
                }
                for e in result.spell_entries
            ],
        })
