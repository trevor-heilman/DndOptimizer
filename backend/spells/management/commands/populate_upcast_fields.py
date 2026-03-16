"""
Management command to parse higher_level text and populate structured upcast fields.

Root cause: Many spells were imported/seeded with a human-readable ``higher_level``
description but their structured upcast fields (``upcast_dice_increment``,
``upcast_die_size``, ``upcast_base_level``, ``upcast_attacks_increment``) were
left NULL.  This means:

  - The analysis engine (SpellAnalysisService) returns flat (non-scaling) damage
    for all slot levels, since ``_upcast_extra_dice`` early-returns 0.
  - The frontend ``scalesWithSlot`` flag is False, so the Upcast Efficiency chart
    never renders on SpellDetailPage.

This command:
  1. Finds leveled spells that have ``higher_level`` text but NULL upcast fields.
  2. Parses two common patterns:
       a. Damage dice increment: "increases by XdY … above Z" →
          upcast_dice_increment=X, upcast_die_size=Y, upcast_base_level=Z
       b. Attack increment: "one additional <projectile> … above Z" →
          upcast_attacks_increment=1, upcast_base_level=Z
  3. Sets the matched fields and saves the spell (bumping updated_at so Redis
     cache keys become stale).
  4. Skips spells that already have any upcast field populated, and spells whose
     higher_level text describes only non-damage scaling (targeting, healing, etc.).

Usage:
  python manage.py populate_upcast_fields             # live run
  python manage.py populate_upcast_fields --dry-run  # preview without saving
  python manage.py populate_upcast_fields --force    # re-parse even if already set

After running, invalidate analysis cache entries:
  python manage.py shell -c "from django.core.cache import cache; cache.clear()"
"""

import re
from django.core.management.base import BaseCommand


# ── Regex patterns ─────────────────────────────────────────────────────────────

# Matches: "damage increases by 2d6" / "cold damage increases by 1d4" etc.
# Captures: (dice_count, die_size)
_DAMAGE_INCREASE = re.compile(
    r'''
    (?:the\s+)?                              # optional "the "
    (?:[\w\s]{0,30}?\s+)?                    # optional qualifier: "cold ", "(both initial and later) "
    damage\s+(?:and\s+\w+\s+)?              # "damage" optionally followed by "and healing " etc.
    (?:increases?|goes\s+up)\s+by\s+        # "increases by" or "goes up by"
    (\d+)\s*d\s*(\d+)                        # XdY — dice_count + die_size
    ''',
    re.IGNORECASE | re.VERBOSE,
)

# Matches: "for each spell slot level above 3" or "for each slot level above 2"
# Captures: (base_level as int-string)
_ABOVE_LEVEL = re.compile(
    r'for\s+each\s+(?:spell\s+)?slot\s+level\s+above\s+(\d+)',
    re.IGNORECASE,
)

# Matches "using a spell slot of Nth level or higher" for base level fallback
# Captures ordinal string like "2nd", "3rd", "4th"
_USING_SLOT = re.compile(
    r'using\s+a\s+(?:level\s+(\d+)|spell\s+slot\s+of\s+(\d+)(?:st|nd|rd|th)\s+level)',
    re.IGNORECASE,
)

# Matches attack increment: "one additional <thing> for each slot level above N"
# Captures: (base_level)
_ATTACK_INCREMENT = re.compile(
    r'one\s+additional\s+(?:\w+\s+)?'
    r'(?:bolt|ray|beam|missile|dart|orb|attack|strike|tendril|arrow|shard)\b'
    r'.*?for\s+each\s+(?:spell\s+)?slot\s+level\s+above\s+(\d+)',
    re.IGNORECASE | re.DOTALL,
)

# Additional damage patterns without "above N"
# e.g. "When you cast using 2nd level, damage increases by 1d8"
_DAMAGE_INCREASE_NO_ABOVE = re.compile(
    r'(?:the\s+)?(?:[\w\s]{0,30}?\s+)?damage\s+'
    r'(?:increases?|goes\s+up)\s+by\s+(\d+)\s*d\s*(\d+)',
    re.IGNORECASE,
)


def _parse_higher_level(text: str, spell_level: int) -> dict | None:
    """
    Attempt to parse an upcast description from the given higher_level text.

    Returns a dict with any combination of:
      upcast_dice_increment, upcast_die_size, upcast_base_level,
      upcast_attacks_increment
    or None if no parseable upcast pattern was found.
    """
    if not text:
        return None

    result: dict = {}

    # ── 1. Attack increment ──────────────────────────────────────────────────
    atk_match = _ATTACK_INCREMENT.search(text)
    if atk_match:
        result["upcast_attacks_increment"] = 1
        result["upcast_base_level"] = int(atk_match.group(1))

    # ── 2. Damage dice increment ─────────────────────────────────────────────
    dmg_match = _DAMAGE_INCREASE.search(text)
    if not dmg_match:
        dmg_match = _DAMAGE_INCREASE_NO_ABOVE.search(text)

    if dmg_match:
        result["upcast_dice_increment"] = int(dmg_match.group(1))
        result["upcast_die_size"] = int(dmg_match.group(2))

        # Try to find "above N" for the base level
        above_match = _ABOVE_LEVEL.search(text)
        if above_match:
            result["upcast_base_level"] = int(above_match.group(1))
        elif "upcast_base_level" not in result:
            # Fallback: "using a spell slot of Nth level" form
            slot_match = _USING_SLOT.search(text)
            if slot_match:
                lvl_str = slot_match.group(1) or slot_match.group(2)
                if lvl_str:
                    # base level is one below the "Nth or higher" slot
                    result["upcast_base_level"] = int(lvl_str) - 1
            else:
                # Last resort: base level = spell's own level
                result["upcast_base_level"] = spell_level

    return result if result else None


class Command(BaseCommand):
    help = "Populate upcast structured fields from higher_level text for spells that are missing them"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print what would be changed without saving anything.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            default=False,
            help="Re-parse and overwrite even if upcast fields are already set.",
        )

    def handle(self, *args, **options):
        from spells.models import Spell

        dry_run: bool = options["dry_run"]
        force: bool = options["force"]

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN] No changes will be saved.\n"))

        # Candidate spells: leveled, have higher_level text
        qs = Spell.objects.filter(level__gt=0, higher_level__isnull=False).exclude(higher_level="")

        if not force:
            # Only process spells missing ALL upcast structured data
            qs = qs.filter(
                upcast_dice_increment__isnull=True,
                upcast_attacks_increment__isnull=True,
            )

        updated = 0
        skipped = 0

        for spell in qs.order_by("name"):
            parsed = _parse_higher_level(spell.higher_level, spell.level)
            if not parsed:
                skipped += 1
                continue

            changes = []
            for field, value in parsed.items():
                old = getattr(spell, field, None)
                if old != value:
                    changes.append(f"{field}: {old!r} → {value!r}")

            if not changes:
                skipped += 1
                continue

            updated += 1
            change_str = ", ".join(changes)
            self.stdout.write(f"  {'[WOULD UPDATE]' if dry_run else 'updating'} {spell.name} (lvl {spell.level}): {change_str}")

            if not dry_run:
                for field, value in parsed.items():
                    setattr(spell, field, value)
                # Bump updated_at to invalidate Redis analysis cache keys
                spell.save(update_fields=list(parsed.keys()) + ["updated_at"])

        action = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{action} {updated} spell(s). Skipped {skipped} (no parseable upcast pattern or no changes)."
            )
        )
        if updated > 0 and not dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Tip: run `python manage.py shell -c \"from django.core.cache import cache; cache.clear()\"` "
                    "to clear stale Redis analysis-cache entries."
                )
            )
