from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from core.throttles import AnalysisRateThrottle
from core.cache_utils import analysis_key, ANALYSIS_TTL
from .models import AnalysisContext, SpellComparison
from .services import SpellAnalysisService
from .serializers import (
    AnalysisContextSerializer,
    SpellComparisonSerializer,
    SpellComparisonRequestSerializer,
    SpellAnalysisRequestSerializer,
    SpellEfficiencyRequestSerializer,
    BreakevenRequestSerializer,
)
from spells.models import Spell


class AnalysisViewSet(viewsets.ViewSet):
    """
    ViewSet for spell analysis operations.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AnalysisRateThrottle]

    @action(detail=False, methods=['post'])
    def compare(self, request):
        """
        Compare two spells in a given context.
        POST /api/analysis/compare/
        """
        serializer = SpellComparisonRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        spell_a = Spell.objects.get(id=data['spell_a_id'])
        spell_b = Spell.objects.get(id=data['spell_b_id'])

        ctx_params = {k: v for k, v in data.items() if k not in ('spell_a_id', 'spell_b_id')}
        ctx_params['_ts_a'] = spell_a.updated_at.timestamp()
        ctx_params['_ts_b'] = spell_b.updated_at.timestamp()
        ck = analysis_key('compare', [spell_a.id, spell_b.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        context = AnalysisContext.create_from_data(
            data, user=request.user if request.user.is_authenticated else None
        )

        results = SpellAnalysisService.compare_spells(spell_a, spell_b, context)
        
        comparison = SpellComparison.objects.create(
            spell_a=spell_a,
            spell_b=spell_b,
            context=context,
            results=results
        )
        
        response_data = SpellComparisonSerializer(comparison).data
        cache.set(ck, response_data, ANALYSIS_TTL)
        return Response(response_data)

    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """
        Analyze a single spell.
        POST /api/analysis/analyze/
        """
        serializer = SpellAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        spell = Spell.objects.get(id=data['spell_id'])

        # Build cache key from spell ID + updated_at + context params
        ctx_params = {k: v for k, v in data.items() if k != 'spell_id'}
        ctx_params['_spell_ts'] = spell.updated_at.timestamp()
        ck = analysis_key('analyze', [spell.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        # Create context
        context = AnalysisContext.create_from_data(
            data, user=request.user if request.user.is_authenticated else None
        )
        
        results = SpellAnalysisService.analyze_spell(spell, context)
        
        response_data = {
            'spell': {'id': str(spell.id), 'name': spell.name, 'level': spell.level},
            'context': AnalysisContextSerializer(context).data,
            'results': results,
        }
        cache.set(ck, response_data, ANALYSIS_TTL)
        return Response(response_data)

    @action(detail=False, methods=['post'])
    def efficiency(self, request):
        """
        Analyze spell efficiency across slot levels.
        POST /api/analysis/efficiency/
        """
        serializer = SpellEfficiencyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        spell = Spell.objects.get(id=data['spell_id'])

        ctx_params = {k: v for k, v in data.items() if k != 'spell_id'}
        ctx_params['_spell_ts'] = spell.updated_at.timestamp()
        ck = analysis_key('efficiency', [spell.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        min_level = data['min_slot_level']
        max_level = data['max_slot_level']
        
        efficiency_data = []
        
        for slot_level in range(min_level, max_level + 1):
            context = AnalysisContext.from_data(data, slot_override=slot_level)
            results = SpellAnalysisService.analyze_spell(spell, context)
            efficiency_data.append({
                'slot_level': slot_level,
                'expected_damage': results['expected_damage'],
                'efficiency': results['efficiency']
            })
        
        response_data = {
            'spell': {'id': str(spell.id), 'name': spell.name, 'level': spell.level},
            'efficiency_by_slot': efficiency_data,
        }
        cache.set(ck, response_data, ANALYSIS_TTL)
        return Response(response_data)

    @action(detail=False, methods=['post'])
    def breakeven(self, request):
        """
        Find the AC and save-bonus crossover points where two spells deal equal damage.
        POST /api/analysis/breakeven/
        """
        serializer = BreakevenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        spell_a = Spell.objects.get(id=data['spell_a_id'])
        spell_b = Spell.objects.get(id=data['spell_b_id'])

        ctx_params = {k: v for k, v in data.items() if k not in ('spell_a_id', 'spell_b_id')}
        ctx_params['_ts_a'] = spell_a.updated_at.timestamp()
        ctx_params['_ts_b'] = spell_b.updated_at.timestamp()
        ck = analysis_key('breakeven', [spell_a.id, spell_b.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        base_context = AnalysisContext.from_data(data)

        results = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, base_context)

        response_data = {
            'spell_a': {'id': str(spell_a.id), 'name': spell_a.name, 'level': spell_a.level},
            'spell_b': {'id': str(spell_b.id), 'name': spell_b.name, 'level': spell_b.level},
            **results,
        }
        cache.set(ck, response_data, ANALYSIS_TTL)
        return Response(response_data)


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
