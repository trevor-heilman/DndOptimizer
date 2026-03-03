from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisViewSet, AnalysisContextViewSet, SpellComparisonViewSet

router = DefaultRouter()
router.register(r'contexts', AnalysisContextViewSet, basename='analysis-context')
router.register(r'comparisons', SpellComparisonViewSet, basename='spell-comparison')

# Analysis actions are in a separate ViewSet (not model-based)
analysis_urls = [
    path('compare/', AnalysisViewSet.as_view({'post': 'compare'}), name='analysis-compare'),
    path('analyze/', AnalysisViewSet.as_view({'post': 'analyze'}), name='analysis-analyze'),
    path('efficiency/', AnalysisViewSet.as_view({'post': 'efficiency'}), name='analysis-efficiency'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('', include(analysis_urls)),
]
