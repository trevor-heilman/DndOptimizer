#!/usr/bin/env python3
"""
Fetch PHB 2024 (Free Rules 2024 / SRD 5.2) spells from the Open5e API
and write them to phb2024_spells.json.

The 2024 D&D SRD is released under Creative Commons CC BY 4.0 and is
available on Open5e.  The document slug varies by Open5e version; the
default here is 'free-rules-2024'.  To find the correct slug for your
Open5e build, check:
    https://api.open5e.com/v1/documents/?format=json

Usage:
    python fetch_phb2024.py
    python fetch_phb2024.py --slug free-rules-2024
    python fetch_phb2024.py --slug srd-2024 --output my_2024_spells.json
"""

import json
import sys
import time
from pathlib import Path

# Reuse the normaliser from the existing SRD fetch script.
sys.path.insert(0, str(Path(__file__).parent))
from fetch_open5e import _fetch_page, normalize_spell  # noqa: E402

SOURCE_LABEL = "Player's Handbook (2024)"
DEFAULT_SLUG = "free-rules-2024"


def fetch_spells_for_slug(slug: str) -> list:
    """Fetch all spells for the given Open5e document slug (paginated)."""
    url = f"https://api.open5e.com/v1/spells/?limit=500&format=json&document__slug={slug}"
    spells = []
    page = 1
    while url:
        print(f"  Page {page}: {url}", flush=True)
        data = _fetch_page(url)
        spells.extend(data.get("results", []))
        url = data.get("next")
        page += 1
        if url:
            time.sleep(0.3)
    return spells


def main():
    args = sys.argv[1:]

    slug = DEFAULT_SLUG
    if "--slug" in args:
        slug = args[args.index("--slug") + 1]

    output_path = Path(__file__).parent / "phb2024_spells.json"
    if "--output" in args:
        output_path = Path(args[args.index("--output") + 1])

    print(f"Fetching PHB 2024 spells from Open5e (document slug: '{slug}')...")
    raw_spells = fetch_spells_for_slug(slug)
    print(f"Fetched {len(raw_spells)} raw spell(s).")

    if not raw_spells:
        print(
            f"\nNo spells found for slug '{slug}'.\n"
            "Check available slugs at: https://api.open5e.com/v1/documents/?format=json\n"
            "Then re-run with: python fetch_phb2024.py --slug <correct-slug>"
        )
        sys.exit(1)

    print("Normalising...")
    normalised = []
    errors = []
    for raw in raw_spells:
        try:
            spell = normalize_spell(raw)
            # Override source so the DB can distinguish from PHB 2014 entries.
            spell["source"] = SOURCE_LABEL
            spell.pop("_slug", None)
            normalised.append(spell)
        except Exception as exc:
            errors.append((raw.get("name", "?"), str(exc)))

    if errors:
        print(f"\nNormalisation errors ({len(errors)}):")
        for name, err in errors:
            print(f"  {name}: {err}")

    def _sort_key(s):
        lv = s.get("level", "cantrip")
        lv_int = 0 if lv == "cantrip" else int(lv)
        return (lv_int, s["name"])

    normalised.sort(key=_sort_key)

    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(normalised, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nWrote {len(normalised)} spell(s) → {output_path}")
    print(
        "\nNext step — import into the database (dedup is automatic):\n"
        "  python manage.py seed_spells --file <path-to-phb2024_spells.json>\n"
        "  OR\n"
        "  python manage.py import_phb2024_spells --slug " + slug
    )


if __name__ == "__main__":
    main()
