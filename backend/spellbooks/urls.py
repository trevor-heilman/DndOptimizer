from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpellbookViewSet

router = DefaultRouter()
router.register(r'', SpellbookViewSet, basename='spellbook')

urlpatterns = [
    path('', include(router.urls)),
]
