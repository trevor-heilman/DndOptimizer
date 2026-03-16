"""
Management command to fetch PHB 2024 (Free Rules 2024 / SRD 5.2) spells
from the Open5e API and import them into the database.

Deduplication key: (name, source).  A spell is skipped if a non-custom
spell with the same name *and* the same source already exists.  This means:
  - Running the command twice is safe — duplicates are never created.
  - A PHB 2014 "Fireball" and a PHB 2024 "Fireball" can coexist because
    their source values differ.

Usage:
    python manage.py import_phb2024_spells
    python manage.py import_phb2024_spells --slug free-rules-2024
    python manage.py import_phb2024_spells --dry-run

To find the correct Open5e document slug for your installation:
    https://api.open5e.com/v1/documents/?format=json
"""

import sys
import time
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from spells.services import SpellParsingService

SOURCE_LABEL = "Player's Handbook (2024)"
DEFAULT_SLUG = "free-rules-2024"


def _fetch_phb2024_spells(slug: str, stdout=None) -> list:
    """Fetch and normalise PHB 2024 spells from Open5e.  Returns normalised dicts."""
    # Import helpers from the data script (sits in backend/data/ alongside manage.py).
    data_dir = Path(__file__).resolve().parents[4] / "data"
    sys.path.insert(0, str(data_dir))
    from fetch_open5e import _fetch_page, normalize_spell  # noqa: E402

    url: str | None = f"https://api.open5e.com/v1/spells/?limit=500&format=json&document__slug={slug}"
    raw_spells = []
    page = 1
    while url:
        if stdout:
            stdout.write(f"  Fetching page {page}: {url}")
        data = _fetch_page(url)
        raw_spells.extend(data.get("results", []))
        url = data.get("next")
        page += 1
        if url:
            time.sleep(0.3)

    normalised = []
    for raw in raw_spells:
        try:
            spell = normalize_spell(raw)
            spell["source"] = SOURCE_LABEL  # force correct source
            spell.pop("_slug", None)
            normalised.append(spell)
        except Exception:
            pass  # normalisation errors are reported in the main loop

    return normalised


class Command(BaseCommand):
    help = (
        "Fetch PHB 2024 (Free Rules 2024 / SRD 5.2) spells from Open5e and "
        "import them into the database.  Existing (name, source) pairs are "
        "skipped so the command is safe to re-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--slug",
            type=str,
            default=DEFAULT_SLUG,
            help=(
                f"Open5e document slug for PHB 2024 content (default: {DEFAULT_SLUG!r}). "
                "Check https://api.open5e.com/v1/documents/?format=json for valid slugs."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Fetch and parse spells but do not write anything to the database.",
        )

    def handle(self, *args, **options):
        from spells.models import Spell

        slug = options["slug"]
        dry_run = options["dry_run"]

        self.stdout.write(f"Fetching PHB 2024 spells from Open5e (slug: '{slug}')...")
        try:
            normalised_spells = _fetch_phb2024_spells(slug, stdout=self.stdout)
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Fetch failed: {exc}"))
            return

        if not normalised_spells:
            self.stderr.write(
                self.style.WARNING(
                    f"No spells returned for slug '{slug}'.\n"
                    "Verify the slug at: https://api.open5e.com/v1/documents/?format=json\n"
                    "Then re-run with: python manage.py import_phb2024_spells --slug <correct-slug>"
                )
            )
            return

        self.stdout.write(f"Fetched {len(normalised_spells)} spell(s). Importing...")

        if dry_run:
            self.stdout.write(self.style.WARNING("[dry-run] No changes will be written."))

        imported = 0
        skipped = 0
        errors = 0

        for spell_data in normalised_spells:
            spell_name = spell_data.get("name", "Unknown")
            try:
                parsed = SpellParsingService.parse_spell_data(spell_data)

                name = parsed["normalized_data"].get("name", "").strip()
                source = parsed["normalized_data"].get("source", "").strip()

                if Spell.objects.filter(name__iexact=name, source=source, is_custom=False).exists():
                    skipped += 1
                    continue

                if dry_run:
                    self.stdout.write(f"  [dry-run] Would import: {name}")
                    imported += 1
                    continue

                with transaction.atomic():
                    SpellParsingService.create_spell_from_parsed_data(parsed, created_by=None)
                imported += 1

            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f"  Failed to import {spell_name}: {exc}"))

        prefix = "[dry-run] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{prefix}Done: {imported} imported, {skipped} skipped (already exist), {errors} errors"
            )
        )
