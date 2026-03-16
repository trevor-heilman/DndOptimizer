"""
Sample tests to verify the setup is working.
These are basic smoke tests - comprehensive tests should be added.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User


@pytest.fixture
def api_client():
    """Fixture for API client."""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Fixture for creating a test user."""
    return User.objects.create_user(username="testuser", email="test@example.com", password="testpass123")


@pytest.mark.django_db
class TestAPIRoot:
    """Test the API root endpoint."""

    def test_api_root(self, api_client):
        """Test that API root is accessible."""
        response = api_client.get("/api/")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data
        assert "endpoints" in response.data


@pytest.mark.django_db
class TestUserAuthentication:
    """Test user authentication endpoints."""

    def test_user_registration(self, api_client):
        """Test user registration."""
        url = reverse("user-register")
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "user" in response.data
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == "newuser@example.com"

    def test_user_login(self, api_client, test_user):
        """Test user login."""
        url = reverse("user-login")
        data = {"email": "test@example.com", "password": "testpass123"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "user" in response.data
        assert "access" in response.data
        assert "refresh" in response.data

    def test_get_current_user(self, api_client, test_user):
        """Test getting current user profile."""
        api_client.force_authenticate(user=test_user)
        url = reverse("user-me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == test_user.email


@pytest.mark.django_db
class TestDiceCalculator:
    """Test the dice calculation mathematical functions."""

    def test_dice_average(self):
        """Test dice average calculation."""
        from analysis.services import DiceCalculator

        # 1d6 average = (1+6)/2 = 3.5
        assert DiceCalculator.average(1, 6) == 3.5

        # 2d6 average = 2 * 3.5 = 7
        assert DiceCalculator.average(2, 6) == 7.0

        # 8d6 average = 8 * 3.5 = 28
        assert DiceCalculator.average(8, 6) == 28.0

    def test_dice_with_modifier(self):
        """Test dice average with modifier."""
        from analysis.services import DiceCalculator

        # 1d6+3 average = 3.5 + 3 = 6.5
        assert DiceCalculator.average(1, 6, 3) == 6.5

    def test_dice_maximum(self):
        """Test dice maximum calculation."""
        from analysis.services import DiceCalculator

        assert DiceCalculator.maximum(8, 6) == 48
        assert DiceCalculator.maximum(8, 6, 5) == 53


@pytest.mark.django_db
class TestAttackRollCalculator:
    """Test attack roll probability calculations."""

    def test_hit_probability_basic(self):
        """Test basic hit probability."""
        from analysis.services import AttackRollCalculator

        # +5 to hit vs AC 15: need 10+, so 11/20 = 0.55
        prob = AttackRollCalculator.hit_probability(5, 15)
        assert prob == 0.55

    def test_hit_probability_clamped(self):
        """Test that hit probability is clamped between 0.05 and 0.95."""
        from analysis.services import AttackRollCalculator

        # Very high AC - should be clamped to 0.05
        prob = AttackRollCalculator.hit_probability(5, 30)
        assert prob == 0.05

        # Very low AC - should be clamped to 0.95
        prob = AttackRollCalculator.hit_probability(20, 5)
        assert prob == 0.95

    def test_crit_probability(self):
        """Test critical hit probability."""
        from analysis.services import AttackRollCalculator

        # Normal crit: 1/20 = 0.05
        prob = AttackRollCalculator.crit_probability()
        assert prob == 0.05


@pytest.mark.django_db
class TestSavingThrowCalculator:
    """Test saving throw probability calculations."""

    def test_save_failure_probability(self):
        """Test save failure probability."""
        from analysis.services import SavingThrowCalculator

        # DC 15, +2 save bonus: need 13+, fail on 1-12, so 12/20 = 0.6
        prob = SavingThrowCalculator.save_failure_probability(15, 2)
        assert prob == 0.6

    def test_save_probability_clamped(self):
        """Test that save probability is clamped."""
        from analysis.services import SavingThrowCalculator

        # Very high DC - should be clamped
        prob = SavingThrowCalculator.save_failure_probability(30, 2)
        assert prob == 0.95

        # Very low DC - should be clamped
        prob = SavingThrowCalculator.save_failure_probability(5, 10)
        assert prob == 0.05


@pytest.mark.django_db
class TestRateLimiting:
    """
    Verify throttle classes are applied to sensitive endpoints.
    Patches SimpleRateThrottle.THROTTLE_RATES directly because the class attribute
    is set at import time and override_settings won't update it retroactively.
    """

    TINY_RATES = {
        "login": "3/min",
        "register": "3/min",
        "password_change": "3/min",
        "analysis": "3/min",
        "spell_import": "3/min",
    }

    def test_login_rate_limit_enforced(self, api_client, db):
        """After 3 login attempts from the same IP the endpoint returns 429."""
        from unittest.mock import patch

        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        url = "/api/users/login/"
        payload = {"email": "noexist@example.com", "password": "wrong"}

        with patch.object(SimpleRateThrottle, "THROTTLE_RATES", self.TINY_RATES):
            for _ in range(3):
                api_client.post(url, payload, format="json")
            response = api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        cache.clear()

    def test_register_rate_limit_enforced(self, api_client, db):
        """After 3 registration attempts the endpoint returns 429."""
        from unittest.mock import patch

        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        url = "/api/users/register/"
        base_payload = {
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        }

        with patch.object(SimpleRateThrottle, "THROTTLE_RATES", self.TINY_RATES):
            for i in range(3):
                api_client.post(
                    url,
                    {**base_payload, "username": f"u{i}", "email": f"u{i}@example.com"},
                    format="json",
                )
            response = api_client.post(
                url,
                {**base_payload, "username": "u99", "email": "u99@example.com"},
                format="json",
            )

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        cache.clear()

    def test_unauthenticated_analysis_blocked(self, api_client, db):
        """Analysis endpoint rejects unauthenticated requests with 401."""
        response = api_client.post("/api/analysis/analyze/", {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_throttle_headers_present_on_429(self, api_client, db):
        """A 429 response from the throttled login endpoint includes Retry-After."""
        from unittest.mock import patch

        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        url = "/api/users/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        with patch.object(SimpleRateThrottle, "THROTTLE_RATES", self.TINY_RATES):
            for _ in range(3):
                api_client.post(url, payload, format="json")
            response = api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Retry-After" in response
        cache.clear()

    def test_throttle_classes_registered_on_login(self):
        """LoginRateThrottle is applied to the login view action."""
        from core.throttles import LoginRateThrottle
        from users.views import UserViewSet

        throttle_classes = getattr(UserViewSet.login, "kwargs", {}).get("throttle_classes")
        assert throttle_classes is not None
        assert LoginRateThrottle in throttle_classes

    def test_throttle_classes_registered_on_register(self):
        """RegisterRateThrottle is applied to the register view action."""
        from core.throttles import RegisterRateThrottle
        from users.views import UserViewSet

        throttle_classes = getattr(UserViewSet.register, "kwargs", {}).get("throttle_classes")
        assert throttle_classes is not None
        assert RegisterRateThrottle in throttle_classes
