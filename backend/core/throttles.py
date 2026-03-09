"""
Custom DRF throttle classes for sensitive endpoints.

Rates are configured via REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] in settings.
"""
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Limits login attempts by IP address.
    Scope: 'login'
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class RegisterRateThrottle(SimpleRateThrottle):
    """
    Limits registration attempts by IP address.
    Scope: 'register'
    """
    scope = 'register'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class PasswordChangeRateThrottle(UserRateThrottle):
    """
    Limits password-change requests per authenticated user.
    Scope: 'password_change'
    """
    scope = 'password_change'


class AnalysisRateThrottle(UserRateThrottle):
    """
    Limits analysis requests per authenticated user.
    Scope: 'analysis'
    """
    scope = 'analysis'


class SpellImportRateThrottle(UserRateThrottle):
    """
    Limits bulk spell-import requests per authenticated user.
    Scope: 'spell_import'
    """
    scope = 'spell_import'
