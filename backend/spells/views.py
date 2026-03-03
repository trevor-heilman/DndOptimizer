from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Spell, DamageComponent
from .serializers import (
    SpellListSerializer,
    SpellDetailSerializer,
    SpellCreateUpdateSerializer,
    SpellImportSerializer,
    SpellExportSerializer,
    DamageComponentSerializer
)


class SpellViewSet(viewsets.ModelViewSet):
    """
    ViewSet for spell CRUD operations.
    """
    queryset = Spell.objects.all().prefetch_related('damage_components', 'parsing_metadata')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
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
        
        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user, is_custom=True)

    @action(detail=False, methods=['post'])
    def import_spells(self, request):
        """
        Bulk import spells from JSON.
        POST /api/spells/import_spells/
        """
        serializer = SpellImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        spells_data = serializer.validated_data['spells']
        source = serializer.validated_data['source']
        auto_parse = serializer.validated_data['auto_parse']
        
        imported_spells = []
        failed_spells = []
        
        for spell_data in spells_data:
            try:
                # Create spell with raw data
                spell = Spell.objects.create(
                    name=spell_data.get('name'),
                    level=spell_data.get('level', 0),
                    school=spell_data.get('school', 'evocation'),
                    source=source,
                    raw_data=spell_data,
                    created_by=request.user if request.user.is_authenticated else None
                )
                
                # TODO: If auto_parse, trigger parsing service
                # This will be implemented in the parsing service
                
                imported_spells.append(spell)
            except Exception as e:
                failed_spells.append({
                    'name': spell_data.get('name', 'Unknown'),
                    'error': str(e)
                })
        
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
