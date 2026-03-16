#!/usr/bin/env python3
"""
Convert the PHB 2024 community JSON (documentation/data/phb2024_spells.json)
into the Spellwright spells.json schema so it can be imported with:

    python manage.py seed_spells --file /app/data/phb2024_spells.json

Source schema differences handled here:
  - actionType (action/bonusAction/reaction) → casting_time string
  - castingTime override (e.g. "1 minute") supersedes actionType
  - castingTrigger appended to reaction casting_time
  - components array ["v","s","m"] → components object {verbal, somatic, material, raw}
  - material string lives at top-level in source
  - higherLevelSlot → higher_levels
  - cantripUpgrade → higher_levels (fallback for cantrips)
  - concentration bool + duration string → normalised duration with "Concentration, up to …" prefix
  - source hard-coded to "Player's Handbook (2024)"
"""

import json
import re
import sys
from pathlib import Path

SOURCE_FILE = Path(__file__).resolve().parent.parent.parent / "documentation" / "data" / "phb2024_spells.json"
OUTPUT_FILE = Path(__file__).resolve().parent / "phb2024_spells.json"

SOURCE_NAME = "Player's Handbook (2024)"

_ACTION_TYPE_MAP = {
    "action": "1 action",
    "bonusAction": "1 bonus action",
    "reaction": "1 reaction",
}


def _casting_time(raw: dict) -> str:
    """Derive casting_time string from actionType / castingTime / castingTrigger."""
    action_type = raw.get("actionType", "action")

    # Explicit override wins (e.g. "1 minute", "1 hour")
    explicit = raw.get("castingTime", "")
    if explicit:
        return explicit

    base = _ACTION_TYPE_MAP.get(action_type, "1 action")

    # For reactions, append the trigger if available.
    # The castingTrigger value already reads e.g. "which you take when …", so
    # we join with a comma/space rather than prepending our own "which you take".
    if action_type == "reaction":
        trigger = raw.get("castingTrigger", "")
        if trigger:
            return f"1 reaction, {trigger}"

    return base


def _components(raw: dict) -> dict:
    """Build a components object matching the spells.json schema."""
    comp_list = [c.lower() for c in raw.get("components", [])]
    verbal = "v" in comp_list
    somatic = "s" in comp_list
    material = "m" in comp_list
    mat_text = (raw.get("material") or "").strip()

    parts = []
    if verbal:
        parts.append("V")
    if somatic:
        parts.append("S")
    if material:
        parts.append("M")

    raw_str = ", ".join(parts)
    if mat_text:
        raw_str += f" ({mat_text})"

    obj: dict = {
        "verbal": verbal,
        "somatic": somatic,
        "material": material,
        "raw": raw_str,
    }
    if mat_text:
        obj["materials_needed"] = [mat_text]
    return obj


def _duration(raw: dict) -> str:
    """Normalize duration, prepending "Concentration, up to …" when required."""
    duration = (raw.get("duration") or "").strip()
    concentration = bool(raw.get("concentration", False))
    if concentration and not duration.lower().startswith("concentration"):
        # Strip a leading "up to" so we don't get "Concentration, up to up to 1 minute"
        d_clean = re.sub(r"^[Uu]p\s+to\s+", "", duration).strip()
        return f"Concentration, up to {d_clean}" if d_clean else "Concentration"
    return duration


def _higher_levels(raw: dict) -> str:
    """Return upcast / scaling text: prefer higherLevelSlot, fall back to cantripUpgrade."""
    return (raw.get("higherLevelSlot") or raw.get("cantripUpgrade") or "").strip()


def convert_spell(raw: dict) -> dict:
    return {
        "name": raw["name"],
        "level": raw.get("level", 0),  # keep as int; SpellParsingService handles both
        "school": raw.get("school", "evocation").lower(),
        "casting_time": _casting_time(raw),
        "range": raw.get("range", ""),
        "duration": _duration(raw),
        "concentration": bool(raw.get("concentration", False)),
        "ritual": bool(raw.get("ritual", False)),
        "classes": [c.lower() for c in raw.get("classes", [])],
        "components": _components(raw),
        "description": (raw.get("description") or "").strip(),
        "higher_levels": _higher_levels(raw),
        "source": SOURCE_NAME,
    }


def main() -> None:
    if not SOURCE_FILE.exists():
        print(f"ERROR: source file not found: {SOURCE_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(SOURCE_FILE, encoding="utf-8") as f:
        source_spells = json.load(f)

    converted = [convert_spell(s) for s in source_spells]

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(converted, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(converted)} spells → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
