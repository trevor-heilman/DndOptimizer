from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CharacterViewSet, SpellbookViewSet

router = DefaultRouter()
router.register(r'characters', CharacterViewSet, basename='character')
router.register(r'', SpellbookViewSet, basename='spellbook')

urlpatterns = [
    path('', include(router.urls)),
]
