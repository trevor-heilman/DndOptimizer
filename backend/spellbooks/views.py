from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from .models import Spellbook, PreparedSpell
from .serializers import (
    SpellbookListSerializer,
    SpellbookDetailSerializer,
    SpellbookCreateUpdateSerializer,
    AddSpellToSpellbookSerializer,
    UpdatePreparedSpellSerializer,
    SpellbookExportSerializer
)


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
