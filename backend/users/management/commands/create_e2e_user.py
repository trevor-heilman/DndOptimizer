"""Management command: create_e2e_user

Creates (or updates) a test user from environment variables.
Intended for CI/CD pipelines where passing credentials via -c "..." shell
heredocs is fragile.  Reads E2E_EMAIL and E2E_PASSWORD from the environment.

Usage:
    docker compose exec -T -e E2E_EMAIL -e E2E_PASSWORD backend \\
        python manage.py create_e2e_user
"""

import os
import sys

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the E2E test user (reads E2E_EMAIL / E2E_PASSWORD from env)"

    def handle(self, *args, **options):  # type: ignore[override]
        email = os.environ.get("E2E_EMAIL", "").strip()
        password = os.environ.get("E2E_PASSWORD", "").strip()

        if not email or not password:
            self.stderr.write(
                "ERROR: E2E_EMAIL and E2E_PASSWORD environment variables must be set."
            )
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
