from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpellViewSet, DamageComponentViewSet

router = DefaultRouter()
router.register(r'spells', SpellViewSet, basename='spell')
router.register(r'damage-components', DamageComponentViewSet, basename='damage-component')

urlpatterns = [
    path('', include(router.urls)),
]
