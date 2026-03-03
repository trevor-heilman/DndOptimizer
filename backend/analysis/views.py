from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnalysisContext, SpellComparison
from .services import SpellAnalysisService
from .serializers import (
    AnalysisContextSerializer,
    SpellComparisonSerializer,
    SpellComparisonRequestSerializer,
    SpellAnalysisRequestSerializer,
    SpellEfficiencyRequestSerializer
)
from spells.models import Spell


class AnalysisViewSet(viewsets.ViewSet):
    """
    ViewSet for spell analysis operations.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def compare(self, request):
        """
        Compare two spells in a given context.
        POST /api/analysis/compare/
        """
        serializer = SpellComparisonRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get spells
        spell_a = Spell.objects.get(id=data['spell_a_id'])
        spell_b = Spell.objects.get(id=data['spell_b_id'])
        
        # Create context
        context = AnalysisContext.objects.create(
            target_ac=data['target_ac'],
            target_save_bonus=data['target_save_bonus'],
            spell_save_dc=data['spell_save_dc'],
            caster_attack_bonus=data['caster_attack_bonus'],
            number_of_targets=data['number_of_targets'],
            advantage=data['advantage'],
            disadvantage=data['disadvantage'],
            spell_slot_level=data['spell_slot_level'],
            crit_enabled=data['crit_enabled'],
            half_damage_on_save=data['half_damage_on_save'],
            evasion_enabled=data['evasion_enabled'],
            created_by=request.user if request.user.is_authenticated else None
        )
        
        # Perform comparison
        results = SpellAnalysisService.compare_spells(spell_a, spell_b, context)
        
        # Save comparison
        comparison = SpellComparison.objects.create(
            spell_a=spell_a,
            spell_b=spell_b,
            context=context,
            results=results
        )
        
        return Response(SpellComparisonSerializer(comparison).data)

    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """
        Analyze a single spell.
        POST /api/analysis/analyze/
        """
        serializer = SpellAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get spell
        spell = Spell.objects.get(id=data['spell_id'])
        
        # Create context
        context = AnalysisContext.objects.create(
            target_ac=data['target_ac'],
            target_save_bonus=data['target_save_bonus'],
            spell_save_dc=data['spell_save_dc'],
            caster_attack_bonus=data['caster_attack_bonus'],
            number_of_targets=data['number_of_targets'],
            advantage=data['advantage'],
            disadvantage=data['disadvantage'],
            spell_slot_level=data['spell_slot_level'],
            crit_enabled=data['crit_enabled'],
            half_damage_on_save=data['half_damage_on_save'],
            evasion_enabled=data['evasion_enabled'],
            created_by=request.user if request.user.is_authenticated else None
        )
        
        # Analyze spell
        results = SpellAnalysisService.analyze_spell(spell, context)
        
        return Response({
            'spell': {
                'id': str(spell.id),
                'name': spell.name,
                'level': spell.level,
            },
            'context': AnalysisContextSerializer(context).data,
            'results': results
        })

    @action(detail=False, methods=['post'])
    def efficiency(self, request):
        """
        Analyze spell efficiency across slot levels.
        POST /api/analysis/efficiency/
        """
        serializer = SpellEfficiencyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get spell
        spell = Spell.objects.get(id=data['spell_id'])
        
        min_level = data['min_slot_level']
        max_level = data['max_slot_level']
        
        efficiency_data = []
        
        for slot_level in range(min_level, max_level + 1):
            # Create context for this slot level
            context = AnalysisContext(
                target_ac=data['target_ac'],
                target_save_bonus=data['target_save_bonus'],
                spell_save_dc=data['spell_save_dc'],
                caster_attack_bonus=data['caster_attack_bonus'],
                number_of_targets=data['number_of_targets'],
                advantage=data['advantage'],
                disadvantage=data['disadvantage'],
                spell_slot_level=slot_level,
                crit_enabled=data['crit_enabled'],
                half_damage_on_save=data['half_damage_on_save'],
                evasion_enabled=data['evasion_enabled']
            )
            
            # Analyze at this slot level
            results = SpellAnalysisService.analyze_spell(spell, context)
            
            efficiency_data.append({
                'slot_level': slot_level,
                'expected_damage': results['expected_damage'],
                'efficiency': results['efficiency']
            })
        
        return Response({
            'spell': {
                'id': str(spell.id),
                'name': spell.name,
                'level': spell.level,
            },
            'efficiency_by_slot': efficiency_data
        })


class AnalysisContextViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing analysis contexts.
    """
    queryset = AnalysisContext.objects.all()
    serializer_class = AnalysisContextSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own contexts."""
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)


class SpellComparisonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing saved spell comparisons.
    """
    queryset = SpellComparison.objects.all().select_related(
        'spell_a', 'spell_b', 'context'
    )
    serializer_class = SpellComparisonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own comparisons."""
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(context__created_by=self.request.user)
