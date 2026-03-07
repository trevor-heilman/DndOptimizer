from .base import *

DEBUG = False
ALLOWED_HOSTS = ['testserver']
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Use local-memory cache in tests so no Redis dependency is required.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
