from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DamageComponentViewSet, SpellViewSet

router = DefaultRouter()
router.register(r"spells", SpellViewSet, basename="spell")
router.register(r"damage-components", DamageComponentViewSet, basename="damage-component")

urlpatterns = [
    path("", include(router.urls)),
]
