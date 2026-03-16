"""
Management command to import TCE summoning-spell creature stat blocks from
backend/data/TCoE_spells.json and link them to Spell objects.

For each "creature entry" (those that have an Actions list) in the JSON:
  1. Determine which Spell it belongs to (from the Description field).
  2. Create or update the Spell record if it is missing.
  3. Create or update SummonTemplate + SummonAttack rows.

Spell metadata (level, school, classes) for the 9 TCE summoning spells is
hardcoded here because TCoE_spells.json carries only narrative description text,
not structured spell attributes.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from spells.models import Spell, SummonAttack, SummonTemplate

# ── Hardcoded metadata for TCE summoning spells ───────────────────────────────
# Derived from the TCoE rule book; level cross-checked against the hp_base_level
# embedded in each creature's HP Notes field.
SUMMON_SPELL_META: dict[str, dict[str, Any]] = {
    "Summon Beast": {
        "level": 2,
        "school": "conjuration",
        "classes": ["druid", "ranger"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "a feather, tuft of fur, and fish tail inside a gilded acorn worth at least 200 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Fey": {
        "level": 3,
        "school": "conjuration",
        "classes": ["druid", "ranger", "warlock", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "a gilded flower worth at least 300 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Shadowspawn": {
        "level": 3,
        "school": "conjuration",
        "classes": ["warlock", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "tears inside a gem worth at least 300 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Undead": {
        "level": 3,
        "school": "necromancy",
        "classes": ["warlock", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "a gilded skull worth at least 300 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Aberration": {
        "level": 4,
        "school": "conjuration",
        "classes": ["warlock", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "a pickled tentacle and an eyeball in a platinum-inlaid vial worth at least 400 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Construct": {
        "level": 4,
        "school": "conjuration",
        "classes": ["artificer", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "an ornate stone and metal lockbox worth at least 400 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Elemental": {
        "level": 4,
        "school": "conjuration",
        "classes": ["druid", "ranger", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "air, a pebble, ash, and water inside a gold-inlaid vial worth at least 400 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Celestial": {
        "level": 5,
        "school": "conjuration",
        "classes": ["cleric", "paladin"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "a golden reliquary worth at least 500 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
    "Summon Fiend": {
        "level": 6,
        "school": "conjuration",
        "classes": ["warlock", "wizard"],
        "concentration": True,
        "duration": "Concentration, up to 1 hour",
        "casting_time": "1 action",
        "range": "90 feet",
        "components_v": True,
        "components_s": True,
        "components_m": True,
        "material": "humanoid blood inside a ruby vial worth at least 600 gp",
        "source": "Tasha's Cauldron of Everything",
        "tags": ["summoning"],
    },
}

# Maps the "Description" field in TCoE_spells.json to the Spell.name above.
DESCRIPTION_TO_SPELL: dict[str, str] = {
    desc: spell_name for spell_name in SUMMON_SPELL_META for desc in [f"Part of the {spell_name} spell"]
}

# ── Regex patterns ────────────────────────────────────────────────────────────

# "Melee Weapon Attack" / "Ranged Spell Attack" etc.
_ATTACK_TYPE_RE = re.compile(
    r"(Melee\s+Weapon|Ranged\s+Weapon|Melee\s+Spell|Ranged\s+Spell)\s+Attack",
    re.IGNORECASE,
)
_ATTACK_TYPE_MAP = {
    "melee weapon": "melee_weapon",
    "ranged weapon": "ranged_weapon",
    "melee spell": "melee_spell",
    "ranged spell": "ranged_spell",
}

# Primary: "1d12 + 3 + the spell's level cold damage"
# Captures: dice_count, die_size, flat_modifier, damage_type
_PRIMARY_DMG_RE = re.compile(
    r"(\d+)d(\d+)"  # NdD
    r"(?:\s*\+\s*(\d+))?"  # optional + flat
    r"(?:\s*\+\s*the\s+spell(?:\'s|s)\s+level)?"  # optional + level
    r"\s+(\w+)\s+damage",
    re.IGNORECASE,
)

# Secondary: "+ 1d6 force damage" (Fey spirits)
_SECONDARY_DMG_RE = re.compile(
    r"\+\s*(\d+)d(\d+)\s+(\w+)\s+damage\s*$",
    re.IGNORECASE,
)

# HP scaling: "(+15 for each spell level above 3rd)"
_HP_NOTES_RE = re.compile(
    r"\(\+(\d+)\s+for\s+each\s+spell\s+level\s+above\s+(\d+)",
    re.IGNORECASE,
)

# AC formula: "(11 + the level of the spell, ...)"
_AC_BASE_RE = re.compile(
    r"\((\d+)\s*\+\s*the\s+level\s+of\s+the\s+spell",
    re.IGNORECASE,
)


def _parse_attack_type(content: str) -> str | None:
    m = _ATTACK_TYPE_RE.search(content)
    if not m:
        return None
    key = m.group(1).lower().replace("  ", " ")
    return _ATTACK_TYPE_MAP.get(key)


def _parse_primary_damage(content: str) -> dict[str, Any] | None:
    """
    Extract primary damage fields from an attack content string.
    Returns dict with dice_count, die_size, flat_modifier, flat_per_level,
    damage_type — or None if no match.
    """
    # Work on the "Hit:" portion if present
    hit_part = content
    if "hit:" in content.lower():
        hit_part = content[content.lower().index("hit:") :]

    m = _PRIMARY_DMG_RE.search(hit_part)
    if not m:
        return None

    dice_count = int(m.group(1))
    die_size = int(m.group(2))
    flat_modifier = int(m.group(3)) if m.group(3) else 0
    flat_per_level = 1 if "the spell's level" in hit_part.lower() or "the spells level" in hit_part.lower() else 0
    damage_type = m.group(4).lower()

    return {
        "dice_count": dice_count,
        "die_size": die_size,
        "flat_modifier": flat_modifier,
        "flat_per_level": flat_per_level,
        "damage_type": damage_type,
    }


def _parse_secondary_damage(content: str) -> dict[str, Any] | None:
    """
    Extract optional secondary damage (e.g. Fey "+1d6 force damage").
    Returns dict or None.
    """
    # Find the hit portion, look for a second damage expression after the first
    hit_part = content
    if "hit:" in content.lower():
        hit_part = content[content.lower().index("hit:") :]

    # Remove the first damage expression, then check if another NdD damage remains
    first = _PRIMARY_DMG_RE.search(hit_part)
    if not first:
        return None
    remainder = hit_part[first.end() :]
    m = _SECONDARY_DMG_RE.search(remainder)
    if not m:
        return None

    return {
        "secondary_dice_count": int(m.group(1)),
        "secondary_die_size": int(m.group(2)),
        "secondary_damage_type": m.group(3).lower(),
        "secondary_flat": 0,
    }


def _parse_hp(hp_value: int, hp_notes: str) -> tuple[int, int, int]:
    """
    Returns (base_hp, hp_per_level, hp_base_level).
    hp_notes example: " (+15 for each spell level above 3rd)"
    """
    m = _HP_NOTES_RE.search(hp_notes or "")
    if m:
        return hp_value, int(m.group(1)), int(m.group(2))
    return hp_value, 0, 0


def _parse_ac(ac_value: int, ac_notes: str) -> tuple[int, int]:
    """
    Returns (base_ac, ac_per_level).
    ac_notes example: " (11 + the level of the spell, natural armor)"
    """
    m = _AC_BASE_RE.search(ac_notes or "")
    if m:
        return int(m.group(1)), 1
    return ac_value, 0


class Command(BaseCommand):
    help = "Import TCE summoning creature stat blocks from TCoE_spells.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default=None,
            help="Path to TCoE_spells.json (defaults to backend/data/TCoE_spells.json)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing SummonTemplate rows before importing.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without writing to the database.",
        )

    def handle(self, *args, **options):
        filepath = options["file"] or os.path.join(settings.BASE_DIR, "data", "TCoE_spells.json")

        if not os.path.exists(filepath):
            self.stderr.write(self.style.ERROR(f"File not found: {filepath}"))
            return

        with open(filepath, encoding="utf-8") as fh:
            raw = json.load(fh)

        # Filter to creature entries (those with an Actions list)
        creatures: list[dict[str, Any]] = [
            entry for entry in raw.values() if isinstance(entry, dict) and entry.get("Actions")
        ]
        self.stdout.write(f"Found {len(creatures)} creature entries in {filepath}")

        if options["dry_run"]:
            self._dry_run(creatures)
            return

        if options["clear"]:
            deleted, _ = SummonTemplate.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing SummonTemplate rows."))

        created_spells = 0
        created_templates = 0
        created_attacks = 0
        skipped = 0

        with transaction.atomic():
            for creature in creatures:
                description = creature.get("Description", "")
                spell_name = DESCRIPTION_TO_SPELL.get(description)
                if not spell_name:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Skipping "{creature.get("Name")}" — unrecognised description: "{description}"'
                        )
                    )
                    skipped += 1
                    continue

                # ── Ensure the Spell exists ───────────────────────────────────
                meta = SUMMON_SPELL_META[spell_name]
                spell, is_new = Spell.objects.get_or_create(
                    name=spell_name,
                    defaults={
                        "level": meta["level"],
                        "school": meta["school"],
                        "classes": meta["classes"],
                        "concentration": meta["concentration"],
                        "duration": meta.get("duration", ""),
                        "casting_time": meta.get("casting_time", ""),
                        "range": meta.get("range", ""),
                        "components_v": meta.get("components_v", False),
                        "components_s": meta.get("components_s", False),
                        "components_m": meta.get("components_m", False),
                        "material": meta.get("material", ""),
                        "source": meta.get("source", "Tasha's Cauldron of Everything"),
                        "tags": meta.get("tags", ["summoning"]),
                    },
                )
                if is_new:
                    created_spells += 1
                    self.stdout.write(self.style.SUCCESS(f"  Created spell: {spell_name}"))

                # ── Parse HP / AC ─────────────────────────────────────────────
                hp_data = creature.get("HP", {})
                ac_data = creature.get("AC", {})
                base_hp, hp_per_level, hp_base_level = _parse_hp(hp_data.get("Value", 0), hp_data.get("Notes", ""))
                base_ac, ac_per_level = _parse_ac(ac_data.get("Value", 0), ac_data.get("Notes", ""))

                # ── Create / replace SummonTemplate ──────────────────────────
                template, tmpl_created = SummonTemplate.objects.update_or_create(
                    spell=spell,
                    name=creature["Name"],
                    defaults={
                        "creature_type": creature.get("Type", ""),
                        "base_hp": base_hp,
                        "hp_per_level": hp_per_level,
                        "hp_base_level": hp_base_level,
                        "base_ac": base_ac,
                        "ac_per_level": ac_per_level,
                        "num_attacks_formula": "floor_half_level",
                        "raw_data": creature,
                    },
                )
                if tmpl_created:
                    created_templates += 1

                # Replace all attacks for this template
                template.attacks.all().delete()

                for action in creature.get("Actions", []):
                    content = action.get("Content", "")
                    attack_type = _parse_attack_type(content)
                    if not attack_type:
                        # Not a damage-roll attack (e.g. Multiattack, Healing Touch)
                        continue

                    primary = _parse_primary_damage(content)
                    if not primary:
                        self.stdout.write(
                            self.style.WARNING(
                                f'    Could not parse damage for "{action["Name"]}" of "{creature["Name"]}"'
                            )
                        )
                        continue

                    secondary = _parse_secondary_damage(content) or {}

                    SummonAttack.objects.create(
                        summon=template,
                        name=action["Name"],
                        attack_type=attack_type,
                        **primary,
                        **secondary,
                    )
                    created_attacks += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Spells created: {created_spells} | "
                f"Templates created/updated: {created_templates + (len(creatures) - skipped - created_templates)} | "
                f"Attacks created: {created_attacks} | Skipped: {skipped}"
            )
        )

    def _dry_run(self, creatures: list[dict]) -> None:
        self.stdout.write("\n--- DRY RUN ---\n")
        for creature in creatures:
            description = creature.get("Description", "")
            spell_name = DESCRIPTION_TO_SPELL.get(description)
            name = creature.get("Name", "?")
            if not spell_name:
                self.stdout.write(self.style.WARNING(f'[SKIP] {name} — "{description}"'))
                continue
            self.stdout.write(f"[OK]   {name} → {spell_name}")
            for action in creature.get("Actions", []):
                content = action.get("Content", "")
                atype = _parse_attack_type(content)
                if not atype:
                    continue
                primary = _parse_primary_damage(content)
                secondary = _parse_secondary_damage(content)
                self.stdout.write(f'         {action["Name"]}: {atype}, primary={primary}, secondary={secondary}')
        self.stdout.write("\n--- END DRY RUN ---")
