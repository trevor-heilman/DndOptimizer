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
    CompareGrowthRequestSerializer,
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

        _spells = Spell.objects.prefetch_related('damage_components')
        spell_a = _spells.get(id=data['spell_a_id'])
        spell_b = _spells.get(id=data['spell_b_id'])

        ctx_params = {k: v for k, v in data.items() if k not in ('spell_a_id', 'spell_b_id')}
        ctx_params['_ts_a'] = spell_a.updated_at.timestamp()
        ctx_params['_ts_b'] = spell_b.updated_at.timestamp()
        ck = analysis_key('compare', [spell_a.id, spell_b.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        context = AnalysisContext.from_data(data)

        # Build per-spell contexts, applying any per-spell overrides for
        # number_of_targets and resistance (fall back to shared values if None).
        overrides_a = {}
        if data.get('number_of_targets_a') is not None:
            overrides_a['number_of_targets'] = data['number_of_targets_a']
        if data.get('resistance_a') is not None:
            overrides_a['resistance'] = data['resistance_a']
        overrides_b = {}
        if data.get('number_of_targets_b') is not None:
            overrides_b['number_of_targets'] = data['number_of_targets_b']
        if data.get('resistance_b') is not None:
            overrides_b['resistance'] = data['resistance_b']

        context_a = SpellAnalysisService._clone_context(context, **overrides_a) if overrides_a else context
        context_b = SpellAnalysisService._clone_context(context, **overrides_b) if overrides_b else context

        results = SpellAnalysisService.compare_spells(spell_a, spell_b, context_a, context_b)

        response_data = {'results': results}
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
        spell = Spell.objects.prefetch_related('damage_components').get(id=data['spell_id'])

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
        context.character_level = data.get('character_level', 1)

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
        spell = Spell.objects.prefetch_related('damage_components').get(id=data['spell_id'])

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

        _spells = Spell.objects.prefetch_related('damage_components')
        spell_a = _spells.get(id=data['spell_a_id'])
        spell_b = _spells.get(id=data['spell_b_id'])

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

    @action(detail=False, methods=['post'])
    def compare_growth(self, request):
        """
        Compute damage growth profiles for two spells across character levels 1-20.
        Cantrips are scaled by the standard 5e tier multiplier at each character level.
        Leveled spells use the highest available spell slot at each character level.
        POST /api/analysis/compare_growth/
        """
        serializer = CompareGrowthRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        _spells = Spell.objects.prefetch_related('damage_components')
        spell_a = _spells.get(id=data['spell_a_id'])
        spell_b = _spells.get(id=data['spell_b_id'])

        ctx_params = {k: v for k, v in data.items() if k not in ('spell_a_id', 'spell_b_id')}
        ctx_params['_ts_a'] = spell_a.updated_at.timestamp()
        ctx_params['_ts_b'] = spell_b.updated_at.timestamp()
        ck = analysis_key('compare_growth', [spell_a.id, spell_b.id], ctx_params)
        cached = cache.get(ck)
        if cached is not None:
            return Response(cached)

        # Build a context with spell_slot_level=1 (overridden internally by the service)
        context = AnalysisContext.from_data({**data, 'spell_slot_level': 1})

        growth_data = SpellAnalysisService.compare_growth_analysis(spell_a, spell_b, context)

        response_data = {
            'spell_a': {'id': str(spell_a.id), 'name': spell_a.name, 'level': spell_a.level},
            'spell_b': {'id': str(spell_b.id), 'name': spell_b.name, 'level': spell_b.level},
            **growth_data,
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
