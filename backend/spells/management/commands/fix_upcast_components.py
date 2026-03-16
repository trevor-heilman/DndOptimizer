"""
Management command to remove spurious damage components that were created
from higher-level (upcast) text instead of the base description.

Root cause: SpellParsingService previously ran dice extraction on the combined
description + higher_level text, so "increases by 1d4 for each slot level"
produced an extra 1d4 DamageComponent on every scalable spell.

This command:
  - Iterates every spell that has upcast scaling data stored.
  - Re-parses dice expressions from the spell's stored raw_data description only.
  - Removes any trailing DamageComponents whose count exceeds the expected number
    AND whose (dice_count, die_size) matches the upcast increment — these are
    definitively the spuriously-created components.
  - Skips user-verified components (is_verified=True) to avoid deleting manual edits.
"""

from django.core.management.base import BaseCommand

from spells.services import DamageExtractionService


class Command(BaseCommand):
    help = "Remove damage components incorrectly created from higher-level upcast text"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be removed without deleting anything",
        )

    def handle(self, *args, **options):
        from spells.models import Spell

        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN] No changes will be made.\n"))

        removed_total = 0
        spells_fixed = 0

        qs = Spell.objects.filter(upcast_dice_increment__isnull=False).prefetch_related("damage_components")

        for spell in qs:
            raw_data = getattr(spell, "raw_data", None) or {}

            # Reconstruct the description from whichever field is populated
            description = raw_data.get("description") or raw_data.get("desc", "")
            if isinstance(description, list):
                description = " ".join(description)

            # Fall back to the model's own description field if raw_data is empty
            if not description:
                description = spell.description or ""

            # How many times each (dice_count, die_size) appears in the description
            expected_dice = DamageExtractionService.extract_dice_expressions(description)
            from collections import Counter

            expected_counts: Counter = Counter(expected_dice)

            components = list(spell.damage_components.order_by("created_at", "id"))
            upcast_key = (spell.upcast_dice_increment, spell.upcast_die_size)

            # How many of the upcast-shaped component exist in the description?
            desc_upcast_count = expected_counts.get(upcast_key, 0)
            # How many exist in the DB?
            db_upcast_comps = [c for c in components if (c.dice_count, c.die_size) == upcast_key and not c.is_verified]
            db_upcast_count = len(db_upcast_comps)

            extra_count = db_upcast_count - desc_upcast_count
            if extra_count <= 0:
                continue

            # Remove the trailing `extra_count` unverified upcast-shaped components
            # (sorted by created_at/id so we remove the most recently added ones)
            to_remove = db_upcast_comps[-extra_count:]

            if not to_remove:
                continue

            spells_fixed += 1
            removed_total += len(to_remove)

            desc = f"{spell.name} (level {spell.level})"
            for comp in to_remove:
                msg = (
                    f'  {"[would remove]" if dry_run else "removing"} '
                    f"{comp.dice_count}d{comp.die_size} {comp.damage_type} "
                    f"(id={comp.id}) from {desc}"
                )
                self.stdout.write(msg)
                if not dry_run:
                    comp.delete()

            # Bump updated_at so the Redis cache key (which includes the
            # timestamp) is invalidated — without this, stale spell detail
            # responses are served until the TTL naturally expires.
            if not dry_run:
                spell.save()

        action = "Would remove" if dry_run else "Removed"
        self.stdout.write(
            self.style.SUCCESS(f"\n{action} {removed_total} spurious component(s) " f"across {spells_fixed} spell(s).")
        )
