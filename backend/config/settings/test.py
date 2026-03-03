from .base import *

DEBUG = False
ALLOWED_HOSTS = ['testserver']
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
