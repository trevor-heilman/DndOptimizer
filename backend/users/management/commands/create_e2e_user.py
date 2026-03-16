"""Management command: create_e2e_user

Creates (or updates) a test user from CLI arguments or environment variables.
Intended for CI/CD pipelines.

Usage:
    docker compose exec -T backend \\
        python manage.py create_e2e_user --email E2E@EXAMPLE.COM --password SECRET
"""

import os
import sys

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the E2E test user"

    def add_arguments(self, parser):
        parser.add_argument("--email", default=os.environ.get("E2E_EMAIL", ""))
        parser.add_argument("--password", default=os.environ.get("E2E_PASSWORD", ""))

    def handle(self, *args, **options):
        email = (options["email"] or "").strip()
        password = (options["password"] or "").strip()

        if not email or not password:
            self.stderr.write("ERROR: --email and --password (or E2E_EMAIL/E2E_PASSWORD env vars) must be set.")
            sys.exit(1)

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"username": email},
        )
        user.set_password(password)
        user.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(f"{verb} E2E test user: {email}")
