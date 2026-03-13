#!/usr/bin/env python3
"""
Fetch, normalize, and validate D&D 5e spell data from the Open5e API.

The Open5e API (https://api.open5e.com) aggregates SRD 5.1 spells under
document__slug='srd', which are released under Creative Commons CC BY 4.0.

Usage:
    # Fetch SRD spells and write spells_srd.json (recommended first run)
    python fetch_open5e.py

    # Also compare against existing spells.json and produce a diff report
    python fetch_open5e.py --compare spells.json

    # Merge: SRD spells as base, keep non-SRD spells from existing file
    python fetch_open5e.py --compare spells.json --merge --output spells_merged.json

    # Verbose: show every field correction found
    python fetch_open5e.py --compare spells.json --verbose

Run from inside the backend container or anywhere with Python 3.8+.
No external dependencies required.
"""

import json
import re
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

# ── Source filter ────────────────────────────────────────────────────────────
# 'srd' = D&D 5e SRD 5.1, CC BY 4.0 — safe to include in any project
SRD_SLUG = 'wotc-srd'

# ── Field maps ───────────────────────────────────────────────────────────────
VALID_SCHOOLS = {
    'abjuration', 'conjuration', 'divination', 'enchantment',
    'evocation', 'illusion', 'necromancy', 'transmutation',
}

LEVEL_INT_TO_STR = {
    0: 'cantrip', 1: '1', 2: '2', 3: '3', 4: '4',
    5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
}

OFFICIAL_CLASS_NAMES = {
    'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter',
    'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
}

# ── Duration / concentration normalization ───────────────────────────────────
def _is_concentration(raw) -> bool:
    if raw.get('requires_concentration'):
        return True
    val = raw.get('concentration', '')
    if isinstance(val, str):
        return val.lower().strip() == 'yes'
    return bool(val)


def _normalize_duration(duration: str, concentration: bool) -> str:
    d = duration.strip()
    # Open5e sometimes returns "Up to X" as the duration; strip the leading
    # "Up to " before we prepend "Concentration, up to " to avoid doubling.
    d_clean = re.sub(r'^[Uu]p\s+to\s+', '', d).strip()
    if concentration and not d.lower().startswith('concentration'):
        d = f'Concentration, up to {d_clean}' if d_clean else 'Concentration'
    return d


# ── Level normalization ───────────────────────────────────────────────────────
def _normalize_level(raw) -> str:
    level_int = raw.get('level_int')
    if level_int is not None:
        return LEVEL_INT_TO_STR.get(int(level_int), str(level_int))

    level_str = str(raw.get('level', 'cantrip')).lower().strip()
    if level_str in ('cantrip', '0', 'cantrip-level'):
        return 'cantrip'
    m = re.match(r'^(\d+)', level_str)
    if m:
        return m.group(1)
    return 'cantrip'


# ── Component normalization ───────────────────────────────────────────────────
def _normalize_components(raw) -> dict:
    verbal   = bool(raw.get('requires_verbal_components', False))
    somatic  = bool(raw.get('requires_somatic_components', False))
    material = bool(raw.get('requires_material_components', False))
    mat_text = (raw.get('material') or '').strip()

    parts = []
    if verbal:
        parts.append('V')
    if somatic:
        parts.append('S')
    if material:
        parts.append('M')

    raw_str = ', '.join(parts)
    if mat_text:
        raw_str += f' ({mat_text})'

    comp = {
        'verbal': verbal,
        'somatic': somatic,
        'material': material,
        'raw': raw_str,
    }
    if mat_text:
        comp['materials_needed'] = [mat_text]
    return comp


# ── Class list normalization ──────────────────────────────────────────────────
def _normalize_classes(raw) -> list:
    # spell_lists is the cleanest — already lowercase
    spell_lists = raw.get('spell_lists') or []
    if spell_lists:
        return sorted({c.strip().lower() for c in spell_lists if c.strip().lower() in OFFICIAL_CLASS_NAMES})

    # Fall back to dnd_class comma string
    dnd_class = raw.get('dnd_class', '')
    if dnd_class:
        return sorted({c.strip().lower() for c in dnd_class.split(',') if c.strip().lower() in OFFICIAL_CLASS_NAMES})

    return []


# ── School normalization ──────────────────────────────────────────────────────
def _normalize_school(raw) -> str:
    school = raw.get('school', '')
    if isinstance(school, dict):
        school = school.get('name', '')
    school = school.lower().strip()
    return school if school in VALID_SCHOOLS else 'evocation'


# ── Main normalizer ───────────────────────────────────────────────────────────
def normalize_spell(raw: dict) -> dict:
    """Convert an Open5e API spell object to the Spellwright spells.json schema."""
    level       = _normalize_level(raw)
    school      = _normalize_school(raw)
    classes     = _normalize_classes(raw)
    components  = _normalize_components(raw)
    concentration = _is_concentration(raw)
    duration    = _normalize_duration(raw.get('duration', ''), concentration)

    ritual_raw = raw.get('can_be_cast_as_ritual', False)
    if not ritual_raw and isinstance(raw.get('ritual'), str):
        ritual_raw = raw['ritual'].lower().strip() == 'yes'
    ritual = bool(ritual_raw)

    description = (raw.get('desc') or '').strip()
    higher_levels = (raw.get('higher_level') or '').strip()
    casting_time = (raw.get('casting_time') or '1 action').strip()
    range_val    = (raw.get('range') or '').strip()
    source       = (raw.get('document__title') or 'SRD 5.1').strip()

    return {
        'name':         raw['name'],
        'level':        level,
        'school':       school,
        'casting_time': casting_time,
        'range':        range_val,
        'duration':     duration,
        'ritual':       ritual,
        'concentration': concentration,
        'classes':      classes,
        'components':   components,
        'description':  description,
        'higher_levels': higher_levels,
        'source':       source,
        # keep slug for cross-referencing
        '_slug':        raw.get('slug', ''),
    }


# ── API fetching ──────────────────────────────────────────────────────────────
def _fetch_page(url: str) -> dict:
    """Fetch a single page, preferring curl subprocess (works reliably in WSL)."""
    import ssl
    import subprocess
    try:
        result = subprocess.run(
            ['curl', '-s', '--max-time', '30', '-A', 'SpellwrightFetcher/1.0', url],
            capture_output=True, text=True, timeout=35,
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
        # fall through to urllib on curl failure
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    # urllib fallback (with SSL verify disabled for WSL compat)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent': 'SpellwrightFetcher/1.0'})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))


def fetch_srd_spells() -> list:
    """Fetch all SRD spells from Open5e v1 API (paginated)."""
    url = f'https://api.open5e.com/v1/spells/?limit=500&format=json&document__slug={SRD_SLUG}'
    spells = []
    page = 1
    while url:
        print(f'  Page {page}: {url}', flush=True)
        data = _fetch_page(url)
        spells.extend(data['results'])
        url = data.get('next')
        page += 1
        if url:
            time.sleep(0.3)
    return spells


# ── Diff / comparison ─────────────────────────────────────────────────────────
def compare_spells(srd_spells: list, existing_path: Path, verbose: bool = False) -> dict:
    """
    Cross-reference SRD spells against an existing spells.json.
    Returns a report dict.
    """
    with open(existing_path, encoding='utf-8') as f:
        existing = json.load(f)

    # Normalise apostrophes so names like "Arcanist\u2019s" == "Arcanist's"
    def _norm_name(n: str) -> str:
        return n.strip().replace('\u2019', "'").replace('\u2018', "'")

    existing_by_name = {_norm_name(s['name']): s for s in existing}
    srd_by_name = {_norm_name(s['name']): s for s in srd_spells}

    in_srd_not_existing = sorted(set(srd_by_name) - set(existing_by_name))
    in_existing_not_srd = sorted(set(existing_by_name) - set(srd_by_name))
    in_both = sorted(set(srd_by_name) & set(existing_by_name))

    COMPARE_STRINGS = ['name', 'casting_time', 'range', 'duration', 'school']

    field_diffs = defaultdict(list)  # field → list of (name, existing_val, srd_val)

    for name in in_both:
        ex = existing_by_name[name]
        srd = srd_by_name[name]

        for field in COMPARE_STRINGS:
            e_val = str(ex.get(field, '')).strip()
            s_val = str(srd.get(field, '')).strip()
            # Range: our data may include AoE detail, e.g. "Self (60-foot cone)"
            # while SRD just says "Self".  Consider equal when existing starts
            # with the SRD value (our data is legitimately richer).
            if field == 'range' and e_val.lower().startswith(s_val.lower()):
                continue
            if e_val.lower() != s_val.lower():
                field_diffs[field].append((name, e_val, s_val))

        # Concentration: our JSON stores it in the duration string, not as a
        # separate boolean.  Derive it from duration for fair comparison.
        e_conc = bool(ex.get('concentration')) or \
            'concentration' in str(ex.get('duration', '')).lower()
        s_conc = bool(srd.get('concentration', False))
        if e_conc != s_conc:
            field_diffs['concentration'].append((name, e_conc, s_conc))

        # Ritual bool
        e_ritual = bool(ex.get('ritual', False))
        s_ritual = bool(srd.get('ritual', False))
        if e_ritual != s_ritual:
            field_diffs['ritual'].append((name, e_ritual, s_ritual))

    return {
        'in_srd_not_existing': in_srd_not_existing,
        'in_existing_not_srd': in_existing_not_srd,
        'in_both': in_both,
        'field_diffs': dict(field_diffs),
        'existing_by_name': existing_by_name,
        'srd_by_name': srd_by_name,
    }


def print_report(report: dict, verbose: bool = False):
    srd_missing = report['in_srd_not_existing']
    extra = report['in_existing_not_srd']
    diffs = report['field_diffs']

    print(f'\n{"="*60}')
    print('SPELL DATA COMPARISON REPORT')
    print(f'{"="*60}')
    print(f'SRD spells total:          {len(report["srd_by_name"])}')
    print(f'Existing spells total:     {len(report["existing_by_name"])}')
    print(f'Matched (in both):         {len(report["in_both"])}')
    print(f'In SRD but MISSING locally: {len(srd_missing)}')
    print(f'Local only (non-SRD):       {len(extra)}')

    if srd_missing:
        print('\n-- MISSING from your data (SRD spells not in spells.json) --')
        for name in srd_missing:
            print(f'  + {name}')

    if extra:
        print('\n-- LOCAL ONLY (not in SRD — may be non-SRD or custom) --')
        for name in extra:
            print(f'  ~ {name}')

    if diffs:
        print('\n-- FIELD CORRECTIONS (existing → SRD authoritative) --')
        for field, changes in sorted(diffs.items()):
            print(f'\n  {field.upper()} ({len(changes)} spell(s) differ):')
            for name, old, new in changes:
                if verbose or field in ('casting_time', 'range', 'school', 'ritual'):
                    print(f'    {name}')
                    print(f'      existing: {old!r}')
                    print(f'      srd:      {new!r}')
                else:
                    print(f'    {name}: {old!r} → {new!r}')

    total_issues = len(srd_missing) + sum(len(v) for v in diffs.values())
    print(f'\nTotal issues found: {total_issues}')
    print(f'{"="*60}\n')


# ── Merge ─────────────────────────────────────────────────────────────────────
def merge_spells(report: dict) -> list:
    """
    Merge SRD spells (authoritative) with existing non-SRD spells.
    - For spells in both: SRD wins on all structural fields.
    - For spells only in existing: keep as-is.
    - For spells only in SRD: add them.
    """
    merged = []

    # SRD spells are authoritative
    for _name, spell in report['srd_by_name'].items():
        out = dict(spell)
        # Remove internal fetch metadata
        out.pop('_slug', None)
        merged.append(out)

    # Add non-SRD local spells
    for name in report['in_existing_not_srd']:
        spell = dict(report['existing_by_name'][name])
        spell.setdefault('source', 'Local')
        merged.append(spell)

    # Sort: level (cantrip first), then name
    def sort_key(s):
        lv = s.get('level', 'cantrip')
        lv_int = 0 if lv == 'cantrip' else int(lv)
        return (lv_int, s['name'])

    merged.sort(key=sort_key)
    return merged


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    verbose  = '--verbose' in args
    do_merge = '--merge' in args

    compare_path = None
    if '--compare' in args:
        idx = args.index('--compare')
        compare_path = Path(args[idx + 1])

    output_path = Path(__file__).parent / 'spells_srd.json'
    if '--output' in args:
        idx = args.index('--output')
        output_path = Path(args[idx + 1])

    print('Fetching SRD spells from Open5e API...')
    raw_spells = fetch_srd_spells()
    print(f'Fetched {len(raw_spells)} raw spells from Open5e (document: {SRD_SLUG})')

    print('Normalizing...')
    normalized = []
    errors = []
    for raw in raw_spells:
        try:
            normalized.append(normalize_spell(raw))
        except Exception as e:
            errors.append((raw.get('name', '?'), str(e)))

    if errors:
        print(f'\nNormalization errors ({len(errors)}):')
        for name, err in errors:
            print(f'  {name}: {err}')

    # Sort
    def sort_key(s):
        lv = s.get('level', 'cantrip')
        lv_int = 0 if lv == 'cantrip' else int(lv)
        return (lv_int, s['name'])
    normalized.sort(key=sort_key)

    if compare_path:
        print(f'\nComparing against {compare_path}...')
        report = compare_spells(normalized, compare_path, verbose)
        print_report(report, verbose)

        if do_merge:
            print('Merging SRD + local non-SRD spells...')
            final = merge_spells(report)
            print(f'Merged total: {len(final)} spells')
        else:
            # Still strip internal fields before writing SRD-only output
            final = [{k: v for k, v in s.items() if not k.startswith('_')} for s in normalized]
    else:
        final = [{k: v for k, v in s.items() if not k.startswith('_')} for s in normalized]

    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'\nWrote {len(final)} spells → {output_path}')
    print('Done.')


if __name__ == '__main__':
    main()
