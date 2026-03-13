"""
Management command to fix known data errors in seeded spells.

Corrects issues that can't be caught purely by re-parsing:
  - Wrong range values copied from adjacent JSON entries (e.g. Acid Arrow)
  - DamageComponent timing set to on_hit when the component is actually
    an end-of-turn or delayed DoT (e.g. Acid Arrow 2d4)
  - Missing upcast_base_level where the spell explicitly states the base slot
    (used for correct scaling math)

Run this after seed_spells to ensure corrected metadata is in the DB.
"""
from django.core.management.base import BaseCommand


RANGE_CORRECTIONS = {
    # spell_name: correct_range
    'Acid Arrow':       '90 feet',
    'Continual Flame':  'Touch',
}

CASTING_TIME_CORRECTIONS = {
    # spell_name: correct_casting_time
    'Acid Arrow': '1 action',
    'Alarm':      '1 minute',
}

DURATION_CORRECTIONS = {
    # spell_name: correct_duration
    # SRD: 1 hour (our seed data mistakenly had 1 minute)
    'Protection from Energy': 'Concentration, up to 1 hour',
}

RITUAL_CORRECTIONS = {
    # spell_name: correct ritual bool
    'Hold Person':           False,   # not a ritual in 5e
    'Purify Food and Drink': True,    # is a ritual in 5e
}

COMPONENT_TIMING_CORRECTIONS = {
    # spell_name: list of {dice_count, die_size, damage_type, timing, skip_first}
    # Matches by (dice_count, die_size, damage_type).
    # skip_first: True if there are multiple components with the same signature
    # and the first one is the correct primary on_hit component — skip it so we
    # only re-time the later, delayed ones.
    'Acid Arrow': [
        # The 2d4 acid fires at the end of the target's next turn, not on_hit.
        # It's the only 2d4 acid component (different from the 4d4 on-hit),
        # so skip_first is False.
        {'dice_count': 2, 'die_size': 4, 'damage_type': 'acid',
         'timing': 'end_of_turn', 'skip_first': False},
    ],
}

UPCAST_BASE_LEVEL_CORRECTIONS = {
    # spell_name: correct upcast_base_level
    'Acid Arrow': 2,
}

HALF_ON_MISS_CORRECTIONS = {
    # spell_name: half_damage_on_miss
    'Acid Arrow': True,
}

NUMBER_OF_ATTACKS_CORRECTIONS = {
    # spell_name: correct number_of_attacks
    # Scorching Ray fires 3 independent beams at base level (level 2)
    'Scorching Ray': 3,
}

UPCAST_ATTACKS_INCREMENT_CORRECTIONS = {
    # spell_name: (upcast_attacks_increment, upcast_base_level)
    # Scorching Ray gains 1 extra ray per slot above 2nd
    'Scorching Ray': (1, 2),
}

TAGS_TO_REMOVE = {
    # spell_name: [tags to remove]
    'Scorching Ray': ['summoning'],
}

COMPONENT_ON_CRIT_EXTRA_CORRECTIONS = {
    # spell_name: list of {dice_count, die_size, damage_type, timing, on_crit_extra, skip_first}
    # The Acid Arrow DoT fires at the end of turn — it cannot crit because it is not a
    # direct hit; the attack roll only applies to the initial on-hit component.
    'Acid Arrow': [
        {'dice_count': 2, 'die_size': 4, 'damage_type': 'acid',
         'timing': 'end_of_turn', 'on_crit_extra': False, 'skip_first': False},
    ],
}

COMPONENT_UPCAST_INCREMENT_CORRECTIONS = {
    # spell_name: list of {dice_count, die_size, damage_type, timing, upcast_dice_increment, skip_first}
    # Acid Arrow: "damage (both initial and later) increases by 1d4 per slot above 2nd"
    # Each component scales independently, so each gets its own upcast_dice_increment=1.
    'Acid Arrow': [
        {'dice_count': 4, 'die_size': 4, 'damage_type': 'acid',
         'timing': 'on_hit', 'upcast_dice_increment': 1, 'skip_first': False},
        {'dice_count': 2, 'die_size': 4, 'damage_type': 'acid',
         'timing': 'end_of_turn', 'upcast_dice_increment': 1, 'skip_first': False},
    ],
}


class Command(BaseCommand):
    help = 'Fix known data errors in seeded spells (range, component timing, upcast_base_level)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be changed without writing anything',
        )

    def handle(self, *args, **options):
        from spells.models import Spell, DamageComponent

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN] No changes will be made.\n'))

        spells_updated = 0

        # ── Casting time corrections ─────────────────────────────────────
        for spell_name, correct_ct in CASTING_TIME_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.casting_time != correct_ct:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} casting_time: '
                        f'{spell_name!r} {spell.casting_time!r} → {correct_ct!r}'
                    )
                    if not dry_run:
                        spell.casting_time = correct_ct
                        spell.raw_data['casting_time'] = correct_ct
                        spell.save()
                        spells_updated += 1

        # ── Duration corrections ─────────────────────────────────────────
        for spell_name, correct_dur in DURATION_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.duration != correct_dur:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} duration: '
                        f'{spell_name!r} {spell.duration!r} → {correct_dur!r}'
                    )
                    if not dry_run:
                        spell.duration = correct_dur
                        spell.raw_data['duration'] = correct_dur
                        spell.save()
                        spells_updated += 1

        # ── Ritual corrections ───────────────────────────────────────────
        for spell_name, correct_ritual in RITUAL_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.ritual != correct_ritual:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} ritual: '
                        f'{spell_name!r} {spell.ritual!r} → {correct_ritual!r}'
                    )
                    if not dry_run:
                        spell.ritual = correct_ritual
                        spell.raw_data['ritual'] = correct_ritual
                        spell.save()
                        spells_updated += 1

        # ── Range corrections ────────────────────────────────────────────
        for spell_name, correct_range in RANGE_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.range != correct_range:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} range: '
                        f'{spell_name!r} {spell.range!r} → {correct_range!r}'
                    )
                    if not dry_run:
                        spell.range = correct_range
                        # Also fix raw_data so a future re-seed uses the right value
                        spell.raw_data['range'] = correct_range
                        spell.save()
                        spells_updated += 1

        # ── Upcast base level corrections ────────────────────────────────
        for spell_name, base_level in UPCAST_BASE_LEVEL_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.upcast_base_level != base_level:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} upcast_base_level: '
                        f'{spell_name!r} {spell.upcast_base_level!r} → {base_level!r}'
                    )
                    if not dry_run:
                        spell.upcast_base_level = base_level
                        spell.save()
                        spells_updated += 1

        # ── Half-on-miss corrections ─────────────────────────────────────
        for spell_name, correct_val in HALF_ON_MISS_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.half_damage_on_miss != correct_val:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} half_damage_on_miss: '
                        f'{spell_name!r} {spell.half_damage_on_miss!r} → {correct_val!r}'
                    )
                    if not dry_run:
                        spell.half_damage_on_miss = correct_val
                        spell.save()
                        spells_updated += 1

        # ── Component timing corrections ─────────────────────────────────
        for spell_name, corrections in COMPONENT_TIMING_CORRECTIONS.items():
            try:
                spell = Spell.objects.get(name=spell_name)
            except Spell.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Spell not found: {spell_name!r}'))
                continue
            except Spell.MultipleObjectsReturned:
                self.stdout.write(self.style.WARNING(
                    f'  Multiple spells named {spell_name!r} — skipping timing fix'
                ))
                continue

            for correction in corrections:
                dc = correction['dice_count']
                ds = correction['die_size']
                dt = correction['damage_type']
                new_timing = correction['timing']
                skip_first = correction.get('skip_first', False)

                matching = list(
                    spell.damage_components
                    .filter(dice_count=dc, die_size=ds, damage_type=dt)
                    .order_by('created_at', 'id')
                )

                candidates = matching[1:] if skip_first else matching
                for comp in candidates:
                    if comp.timing != new_timing:
                        self.stdout.write(
                            f'  {"[would fix]" if dry_run else "fixing"} timing: '
                            f'{spell_name!r} {dc}d{ds} {dt} '
                            f'{comp.timing!r} → {new_timing!r}'
                        )
                        if not dry_run:
                            comp.timing = new_timing
                            comp.save()

        # ── Number of attacks corrections ────────────────────────────────
        for spell_name, correct_val in NUMBER_OF_ATTACKS_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.number_of_attacks != correct_val:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} number_of_attacks: '
                        f'{spell_name!r} {spell.number_of_attacks!r} → {correct_val!r}'
                    )
                    if not dry_run:
                        spell.number_of_attacks = correct_val
                        spell.save()
                        spells_updated += 1

        # ── Upcast attacks increment corrections ─────────────────────────
        for spell_name, (increment, base_level) in UPCAST_ATTACKS_INCREMENT_CORRECTIONS.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                if spell.upcast_attacks_increment != increment or spell.upcast_base_level != base_level:
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} upcast_attacks: '
                        f'{spell_name!r} increment={spell.upcast_attacks_increment!r}→{increment!r}, '
                        f'base_level={spell.upcast_base_level!r}→{base_level!r}'
                    )
                    if not dry_run:
                        spell.upcast_attacks_increment = increment
                        spell.upcast_base_level = base_level
                        spell.save()
                        spells_updated += 1

        # ── Tags to remove ───────────────────────────────────────────────
        for spell_name, remove_tags in TAGS_TO_REMOVE.items():
            qs = Spell.objects.filter(name=spell_name)
            for spell in qs:
                current_tags = list(spell.tags or [])
                new_tags = [t for t in current_tags if t not in remove_tags]
                if new_tags != current_tags:
                    removed = set(current_tags) - set(new_tags)
                    self.stdout.write(
                        f'  {"[would fix]" if dry_run else "fixing"} tags: '
                        f'{spell_name!r} removing {removed!r}'
                    )
                    if not dry_run:
                        spell.tags = new_tags
                        spell.save()
                        spells_updated += 1

        # ── Component on_crit_extra corrections ──────────────────────────
        for spell_name, corrections in COMPONENT_ON_CRIT_EXTRA_CORRECTIONS.items():
            try:
                spell = Spell.objects.get(name=spell_name)
            except Spell.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Spell not found: {spell_name!r}'))
                continue
            except Spell.MultipleObjectsReturned:
                self.stdout.write(self.style.WARNING(
                    f'  Multiple spells named {spell_name!r} — skipping on_crit_extra fix'
                ))
                continue

            for correction in corrections:
                dc_filter = {
                    k: correction[k]
                    for k in ('dice_count', 'die_size', 'damage_type', 'timing')
                    if k in correction
                }
                new_val = correction['on_crit_extra']
                skip_first = correction.get('skip_first', False)
                matching = list(
                    spell.damage_components.filter(**dc_filter).order_by('created_at', 'id')
                )
                candidates = matching[1:] if skip_first else matching
                for comp in candidates:
                    if comp.on_crit_extra != new_val:
                        self.stdout.write(
                            f'  {"[would fix]" if dry_run else "fixing"} on_crit_extra: '
                            f'{spell_name!r} {dc_filter} '
                            f'{comp.on_crit_extra!r} → {new_val!r}'
                        )
                        if not dry_run:
                            comp.on_crit_extra = new_val
                            comp.save()

        # ── Component upcast_dice_increment corrections ───────────────────
        for spell_name, corrections in COMPONENT_UPCAST_INCREMENT_CORRECTIONS.items():
            try:
                spell = Spell.objects.get(name=spell_name)
            except Spell.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Spell not found: {spell_name!r}'))
                continue
            except Spell.MultipleObjectsReturned:
                self.stdout.write(self.style.WARNING(
                    f'  Multiple spells named {spell_name!r} — skipping upcast_dice_increment fix'
                ))
                continue

            for correction in corrections:
                dc_filter = {
                    k: correction[k]
                    for k in ('dice_count', 'die_size', 'damage_type', 'timing')
                    if k in correction
                }
                new_val = correction['upcast_dice_increment']
                skip_first = correction.get('skip_first', False)
                matching = list(
                    spell.damage_components.filter(**dc_filter).order_by('created_at', 'id')
                )
                candidates = matching[1:] if skip_first else matching
                for comp in candidates:
                    if comp.upcast_dice_increment != new_val:
                        self.stdout.write(
                            f'  {"[would fix]" if dry_run else "fixing"} upcast_dice_increment: '
                            f'{spell_name!r} {dc_filter} '
                            f'{comp.upcast_dice_increment!r} → {new_val!r}'
                        )
                        if not dry_run:
                            comp.upcast_dice_increment = new_val
                            comp.save()

        if not dry_run:
            action_str = f'{spells_updated} spell(s) updated'
        else:
            action_str = 'dry run complete'
        self.stdout.write(self.style.SUCCESS(f'\nfix_spell_data: {action_str}.'))
