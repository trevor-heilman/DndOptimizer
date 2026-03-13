"""
Convert Xanathar's Guide to Everything spells from ImprovedInitiative export format
to the application's spells.json schema.

Input:  documentation/data/XGtE Spells.JSON
Output: documentation/data/XGtE_Spells_converted.json

Usage:
    python backend/data/convert_xgte.py
"""
import json
import re
from pathlib import Path

ORDINAL = {
    1: '1st', 2: '2nd', 3: '3rd',
    **{n: f'{n}th' for n in range(4, 10)},
}

SCHOOL_MAP = {s.lower(): s.lower() for s in [
    'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]}


def parse_level(raw) -> str:
    """Convert integer or string level to app-format string ('cantrip', '1' … '9')."""
    try:
        lvl = int(raw)
    except (TypeError, ValueError):
        return str(raw).lower()
    return 'cantrip' if lvl == 0 else str(lvl)


def parse_components(raw: str) -> dict:
    """
    Parse a component string like 'V, S, M (material)' into a structured dict.
    """
    result = {
        'verbal': False,
        'somatic': False,
        'material': False,
        'raw': raw,
    }
    # Extract material description from inside the first set of parentheses
    material_match = re.search(r'\((.+)\)\s*$', raw, re.DOTALL)
    if material_match:
        materials_text = material_match.group(1).strip()
        result['material'] = True
        result['materials_needed'] = [materials_text]

    # Determine V/S/M flags from the leading list
    letters = re.split(r'[,\s]+', raw.split('(')[0])
    for letter in letters:
        letter = letter.strip().upper()
        if letter == 'V':
            result['verbal'] = True
        elif letter == 'S':
            result['somatic'] = True
        elif letter == 'M':
            result['material'] = True

    return result


def extract_higher_levels(description: str) -> tuple[str, str]:
    """
    Split description into (main_description, higher_levels).
    Looks for 'At Higher Levels.' as the sentinel.
    """
    marker = 'At Higher Levels.'
    idx = description.find(marker)
    if idx == -1:
        # Also try bold-markdown variant
        marker_md = '**At Higher Levels.**'
        idx = description.find(marker_md)
        if idx != -1:
            rest = description[idx + len(marker_md):].strip()
            return description[:idx].strip(), rest
        return description.strip(), ''
    rest = description[idx + len(marker):].strip()
    return description[:idx].strip(), rest


def build_type(level_str: str, school: str, ritual: bool) -> str:
    """Build the 'type' display string, e.g. '2nd-level abjuration (ritual)'."""
    school_display = school.capitalize()
    if level_str == 'cantrip':
        return f'{school_display} cantrip'
    ordinal = ORDINAL.get(int(level_str), f'{level_str}th')
    suffix = ' (ritual)' if ritual else ''
    return f'{ordinal}-level {school_display.lower()}{suffix}'


def build_tags(level_str: str, classes: list[str], ritual: bool) -> list[str]:
    """Build the tags list: class names + level tag."""
    tags = list(classes)  # already lowercased
    if level_str == 'cantrip':
        tags.append('cantrip')
    else:
        tags.append(f'level{level_str}')
    if ritual:
        tags.append('ritual')
    return tags


def convert_spell(raw_spell: dict) -> dict:
    """Convert a single ImprovedInitiative spell dict to the app schema."""
    level_str = parse_level(raw_spell.get('Level', 0))
    school = SCHOOL_MAP.get(raw_spell.get('School', '').lower(), raw_spell.get('School', '').lower())
    ritual = bool(raw_spell.get('Ritual', False))
    classes = [c.lower() for c in raw_spell.get('Classes', [])]
    description_raw = raw_spell.get('Description', '')
    description, higher_levels = extract_higher_levels(description_raw)
    components = parse_components(raw_spell.get('Components', ''))

    spell = {
        'name': raw_spell['Name'],
        'level': level_str,
        'school': school,
        'casting_time': raw_spell.get('CastingTime', '1 action'),
        'range': raw_spell.get('Range', ''),
        'duration': raw_spell.get('Duration', ''),
        'concentration': raw_spell.get('Duration', '').lower().startswith('concentration'),
        'ritual': ritual,
        'description': description,
        'components': components,
        'classes': classes,
        'tags': build_tags(level_str, classes, ritual),
        'type': build_type(level_str, school, ritual),
        'source': raw_spell.get('Source', "Xanathar's Guide to Everything"),
    }

    if higher_levels:
        spell['higher_levels'] = higher_levels

    return spell


def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    input_path = repo_root / 'documentation' / 'data' / 'XGtE Spells.JSON'
    output_path = repo_root / 'documentation' / 'data' / 'XGtE_Spells_converted.json'

    with open(input_path, 'r', encoding='utf-8') as f:
        outer = json.load(f)

    spells = []
    skipped = 0
    for key, value in outer.items():
        if not key.startswith('ImprovedInitiative.Spells.'):
            continue
        # Each value is a JSON-encoded string
        try:
            raw_spell = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            print(f'  WARNING: Could not parse value for key {key!r}')
            skipped += 1
            continue
        if not isinstance(raw_spell, dict) or 'Name' not in raw_spell:
            skipped += 1
            continue
        spells.append(convert_spell(raw_spell))

    # Sort by level then name to match the pattern of spells.json
    def _sort_key(s):
        lv = s['level']
        return (-1 if lv == 'cantrip' else int(lv), s['name'])

    spells.sort(key=_sort_key)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(spells, f, indent=4, ensure_ascii=False)

    print(f'Converted {len(spells)} spells → {output_path}')
    if skipped:
        print(f'  (skipped {skipped} entries)')


if __name__ == '__main__':
    main()
