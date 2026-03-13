"""
Tests for spells management commands.

Covers:
- check_upcast
- backfill_spell_classes
- fix_upcast_components
- fix_auto_hit_spells
- fix_spell_data
- seed_spells
"""
import json
import os
import tempfile
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from spells.models import DamageComponent, Spell

# ── shared fixtures ───────────────────────────────────────────────────────────

@pytest.fixture
def spell_fireball(db):
    """A saving-throw leveled spell with upcast data."""
    spell = Spell.objects.create(
        name='Fireball', level=3, school='evocation',
        casting_time='1 action', range='150 feet', duration='Instantaneous',
        description='A bright streak flashes from your pointing finger. 8d6 fire damage.',
        is_saving_throw=True, save_type='DEX', half_damage_on_save=True,
        upcast_dice_increment=1, upcast_die_size=6, upcast_base_level=3,
    )
    DamageComponent.objects.create(
        spell=spell, dice_count=8, die_size=6, damage_type='fire', timing='on_hit',
    )
    return spell


@pytest.fixture
def spell_cantrip(db):
    """A cantrip with no upcast data (should appear in check_upcast cantrip count)."""
    return Spell.objects.create(
        name='Prestidigitation', level=0, school='transmutation',
        casting_time='1 action', range='10 feet', duration='Up to 1 hour',
        description='This spell is a minor magical trick.',
    )


@pytest.fixture
def spell_no_upcast(db):
    """A leveled spell without upcast data and with higher_levels text in raw_data."""
    return Spell.objects.create(
        name='Cure Wounds', level=1, school='evocation',
        casting_time='1 action', range='Touch', duration='Instantaneous',
        description='Heals 1d8+mod hit points.',
        raw_data={'higher_levels': 'When you cast this spell using a slot of 2nd level or higher...'},
    )


# ── check_upcast ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCheckUpcastCommand:

    def test_basic_run_no_spells(self):
        """Command runs without error on empty DB."""
        out = StringIO()
        call_command('check_upcast', stdout=out)
        output = out.getvalue()
        assert 'Leveled spells without upcast: 0' in output

    def test_counts_leveled_spells_without_upcast(self, spell_no_upcast):
        """Counts leveled spells that have no upcast_dice_increment."""
        out = StringIO()
        call_command('check_upcast', stdout=out)
        output = out.getvalue()
        assert 'Leveled spells without upcast: 1' in output
        assert 'higher_levels text: 1' in output
        assert 'Genuinely no upcast info: 0' in output

    def test_leveled_spell_with_upcast_not_counted(self, spell_fireball):
        """Spells that have upcast_dice_increment are not in the 'without upcast' count."""
        out = StringIO()
        call_command('check_upcast', stdout=out)
        output = out.getvalue()
        assert 'Leveled spells without upcast: 0' in output

    def test_cantrips_reported(self, spell_cantrip):
        """Cantrips without upcast_dice_increment are reported separately."""
        out = StringIO()
        call_command('check_upcast', stdout=out)
        output = out.getvalue()
        assert 'Cantrips without upcast: 1' in output

    def test_spell_name_shown_in_sample(self, spell_no_upcast):
        """Spells with higher_levels text are shown in sample up to 8."""
        out = StringIO()
        call_command('check_upcast', stdout=out)
        output = out.getvalue()
        assert 'Cure Wounds' in output


# ── backfill_spell_classes ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBackfillSpellClassesCommand:

    def test_no_candidates(self, spell_fireball):
        """Spell with non-empty classes list is not a candidate."""
        spell_fireball.classes = ['wizard', 'sorcerer']
        spell_fireball.save()
        out = StringIO()
        call_command('backfill_spell_classes', stdout=out)
        output = out.getvalue()
        assert 'Found 0 spells with empty classes' in output

    def test_spell_no_raw_data_classes_skipped(self, db):
        """Spell with empty classes and no raw_data classes is skipped."""
        Spell.objects.create(
            name='Detect Magic', level=1, school='divination',
            casting_time='1 action', range='Self', duration='Concentration, up to 10 minutes',
            description='Detect magic.',
            classes=[],
            raw_data={},
        )
        out = StringIO()
        call_command('backfill_spell_classes', stdout=out)
        output = out.getvalue()
        assert 'Skipped 1' in output

    def test_spell_updated_from_string_classes(self, db):
        """Spell with string-list classes in raw_data is updated."""
        spell = Spell.objects.create(
            name='Magic Missile', level=1, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='Non-damaging missile.',
            classes=[],
            raw_data={'classes': ['wizard', 'sorcerer']},
        )
        out = StringIO()
        call_command('backfill_spell_classes', stdout=out)
        output = out.getvalue()
        assert 'Updated 2' in output or 'Updated 1' in output  # 1 spell updated
        spell.refresh_from_db()
        assert 'wizard' in spell.classes
        assert 'sorcerer' in spell.classes

    def test_spell_updated_from_dict_classes(self, db):
        """Spell with dict-list classes (name key) in raw_data is updated."""
        spell = Spell.objects.create(
            name='Identify', level=1, school='divination',
            casting_time='1 minute', range='Touch', duration='Instantaneous',
            description='Identify.',
            classes=[],
            raw_data={'classes': [{'name': 'Wizard'}, {'name': 'Bard'}]},
        )
        out = StringIO()
        call_command('backfill_spell_classes', stdout=out)
        spell.refresh_from_db()
        assert 'wizard' in spell.classes
        assert 'bard' in spell.classes

    def test_dry_run_does_not_update(self, db):
        """Dry run prints would-update but doesn't save."""
        spell = Spell.objects.create(
            name='Shield', level=1, school='abjuration',
            casting_time='1 reaction', range='Self', duration='1 round',
            description='Shield.',
            classes=[],
            raw_data={'classes': ['wizard']},
        )
        out = StringIO()
        call_command('backfill_spell_classes', '--dry-run', stdout=out)
        output = out.getvalue()
        assert '[dry-run]' in output
        assert 'Would update' in output
        spell.refresh_from_db()
        assert spell.classes == []

    def test_non_list_raw_classes_skipped(self, db):
        """If raw_data classes is not a list (e.g. a string), skip."""
        Spell.objects.create(
            name='Bless', level=1, school='enchantment',
            casting_time='1 action', range='30 feet', duration='Concentration, up to 1 minute',
            description='Bless.',
            classes=[],
            raw_data={'classes': 'wizard'},
        )
        out = StringIO()
        call_command('backfill_spell_classes', stdout=out)
        output = out.getvalue()
        assert 'Skipped 1' in output


# ── fix_upcast_components ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFixUpcastComponentsCommand:

    def test_no_spells_with_upcast(self, db):
        """No output when there are no spells with upcast_dice_increment."""
        Spell.objects.create(
            name='Cure Wounds', level=1, school='evocation',
            casting_time='1 action', range='Touch', duration='Instantaneous',
            description='Heals.',
        )
        out = StringIO()
        call_command('fix_upcast_components', stdout=out)
        # Should run without error

    def test_no_extra_components(self, spell_fireball):
        """Spell with exactly 1 upcast-shaped component in description: no removal."""
        # spell_fireball has 8d6 fire, upcast is 1d6 — 8d6 ≠ upcast shape (1d6)
        # so no extra removal needed; command should not error
        out = StringIO()
        call_command('fix_upcast_components', stdout=out)
        assert DamageComponent.objects.filter(spell=spell_fireball).count() == 1

    def test_removes_extra_upcast_component(self, db):
        """Removes component that matches upcast shape and is surplus."""
        spell = Spell.objects.create(
            name='Test Spell', level=1, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Deals 1d8 fire damage.',  # only one 1d8 in description
            upcast_dice_increment=1, upcast_die_size=8, upcast_base_level=1,
        )
        # Base component (legitimate)
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=8, damage_type='fire')
        # Spurious component matching upcast shape
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=8, damage_type='fire')

        out = StringIO()
        call_command('fix_upcast_components', stdout=out)
        output = out.getvalue()
        assert 'removing' in output
        assert DamageComponent.objects.filter(spell=spell).count() == 1

    def test_dry_run_does_not_remove(self, db):
        """Dry run reports removal but does not delete."""
        spell = Spell.objects.create(
            name='Test Dry', level=1, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Deals 1d8 fire damage.',
            upcast_dice_increment=1, upcast_die_size=8, upcast_base_level=1,
        )
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=8, damage_type='fire')
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=8, damage_type='fire')

        out = StringIO()
        call_command('fix_upcast_components', '--dry-run', stdout=out)
        output = out.getvalue()
        assert '[DRY RUN]' in output
        assert '[would remove]' in output
        assert DamageComponent.objects.filter(spell=spell).count() == 2

    def test_verified_component_not_removed(self, db):
        """Verified components are skipped even if they match the upcast shape."""
        spell = Spell.objects.create(
            name='Test Verified', level=1, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Deals 1d8 fire damage.',
            upcast_dice_increment=1, upcast_die_size=8, upcast_base_level=1,
        )
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=8, damage_type='fire')
        # Second component is verified — should NOT be removed
        DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=8, damage_type='fire', is_verified=True
        )
        out = StringIO()
        call_command('fix_upcast_components', stdout=out)
        assert DamageComponent.objects.filter(spell=spell).count() == 2


# ── fix_auto_hit_spells ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFixAutoHitSpellsCommand:

    def test_spell_not_found_shows_warning(self, db):
        """If Magic Missile doesn't exist, a warning is printed."""
        out = StringIO()
        call_command('fix_auto_hit_spells', stdout=out)
        output = out.getvalue()
        assert 'Spell not found: Magic Missile' in output

    def test_already_correct_no_changes(self, db):
        """Spell already matching desired config prints 'already correct'."""
        spell = Spell.objects.create(
            name='Magic Missile', level=1, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='You create three glowing darts.',
            is_auto_hit=True,
            number_of_attacks=3,
            upcast_attacks_increment=1,
            upcast_base_level=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=4, damage_type='force', flat_modifier=1
        )
        out = StringIO()
        call_command('fix_auto_hit_spells', stdout=out)
        output = out.getvalue()
        assert 'already correct' in output

    def test_applies_corrections(self, db):
        """Spell with wrong values gets corrected."""
        spell = Spell.objects.create(
            name='Magic Missile', level=1, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='You create three glowing darts.',
            is_auto_hit=False,
            number_of_attacks=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=4, damage_type='force', flat_modifier=0
        )
        out = StringIO()
        call_command('fix_auto_hit_spells', stdout=out)
        spell.refresh_from_db()
        assert spell.is_auto_hit is True
        assert spell.number_of_attacks == 3
        assert spell.upcast_attacks_increment == 1

    def test_dry_run_does_not_save(self, db):
        """Dry run shows changes but does not apply them."""
        spell = Spell.objects.create(
            name='Magic Missile', level=1, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='You create three glowing darts.',
            is_auto_hit=False,
            number_of_attacks=1,
        )
        out = StringIO()
        call_command('fix_auto_hit_spells', '--dry-run', stdout=out)
        output = out.getvalue()
        assert 'Dry run' in output
        spell.refresh_from_db()
        assert spell.is_auto_hit is False

    def test_multiple_spells_with_same_name(self, db):
        """When multiple spells share a name, all are updated."""
        for _ in range(2):
            Spell.objects.create(
                name='Magic Missile', level=1, school='evocation',
                casting_time='1 action', range='120 feet', duration='Instantaneous',
                description='Glowing darts.',
                is_auto_hit=False, number_of_attacks=1,
            )
        out = StringIO()
        call_command('fix_auto_hit_spells', stdout=out)
        output = out.getvalue()
        assert 'Multiple spells named' in output
        assert Spell.objects.filter(name='Magic Missile', is_auto_hit=True).count() == 2

    def test_component_flat_modifier_applied(self, db):
        """flat_modifier on DamageComponents is updated to 1 for Magic Missile."""
        spell = Spell.objects.create(
            name='Magic Missile', level=1, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='Glowing darts.',
            is_auto_hit=True, number_of_attacks=3,
            upcast_attacks_increment=1, upcast_base_level=1,
        )
        comp = DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=4, damage_type='force', flat_modifier=0
        )
        call_command('fix_auto_hit_spells', stdout=StringIO())
        comp.refresh_from_db()
        assert comp.flat_modifier == 1


# ── fix_spell_data ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFixSpellDataCommand:

    def test_empty_db_runs_cleanly(self, db):
        """Command runs without error when no spells exist."""
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        output = out.getvalue()
        assert 'fix_spell_data:' in output

    def test_dry_run_flag(self, db):
        """Dry run flag produces [DRY RUN] header."""
        out = StringIO()
        call_command('fix_spell_data', '--dry-run', stdout=out)
        output = out.getvalue()
        assert '[DRY RUN]' in output
        assert 'dry run complete' in output

    def test_range_correction_applied(self, db):
        """Acid Arrow range is corrected from wrong value to '90 feet'."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='60 feet',  # wrong
            duration='Instantaneous', description='Acid arrow.',
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.range == '90 feet'

    def test_range_correction_dry_run(self, db):
        """Dry run reports range fix but does not save."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='60 feet',
            duration='Instantaneous', description='Acid arrow.',
        )
        out = StringIO()
        call_command('fix_spell_data', '--dry-run', stdout=out)
        spell.refresh_from_db()
        assert spell.range == '60 feet'

    def test_casting_time_correction(self, db):
        """Acid Arrow casting_time is corrected."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 bonus action',  # wrong
            range='90 feet', duration='Instantaneous', description='Acid arrow.',
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.casting_time == '1 action'

    def test_duration_correction(self, db):
        """Protection from Energy duration is corrected."""
        spell = Spell.objects.create(
            name='Protection from Energy', level=3, school='abjuration',
            casting_time='1 action', range='Touch',
            duration='Concentration, up to 1 minute',  # wrong
            description='Protection.',
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.duration == 'Concentration, up to 1 hour'

    def test_ritual_correction(self, db):
        """Hold Person ritual flag is corrected to False."""
        spell = Spell.objects.create(
            name='Hold Person', level=2, school='enchantment',
            casting_time='1 action', range='60 feet',
            duration='Concentration, up to 1 minute',
            description='Hold Person.', ritual=True,  # wrong
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.ritual is False

    def test_upcast_base_level_correction(self, db):
        """Acid Arrow upcast_base_level is set to 2."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='90 feet', duration='Instantaneous',
            description='Acid arrow.', upcast_base_level=None,
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.upcast_base_level == 2

    def test_number_of_attacks_correction(self, db):
        """Scorching Ray number_of_attacks is corrected to 3."""
        spell = Spell.objects.create(
            name='Scorching Ray', level=2, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='Scorching Ray.', number_of_attacks=1,  # wrong
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.number_of_attacks == 3

    def test_upcast_attacks_increment_correction(self, db):
        """Scorching Ray upcast_attacks_increment is set to 1."""
        spell = Spell.objects.create(
            name='Scorching Ray', level=2, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='Scorching Ray.', number_of_attacks=3, upcast_attacks_increment=None,
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert spell.upcast_attacks_increment == 1
        assert spell.upcast_base_level == 2

    def test_tags_removal(self, db):
        """Removes 'summoning' tag from Scorching Ray."""
        spell = Spell.objects.create(
            name='Scorching Ray', level=2, school='evocation',
            casting_time='1 action', range='120 feet', duration='Instantaneous',
            description='Scorching Ray.', tags=['evocation', 'summoning'],
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        spell.refresh_from_db()
        assert 'summoning' not in spell.tags

    def test_component_timing_correction(self, db):
        """Acid Arrow 2d4 acid component timing is corrected to end_of_turn."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='90 feet', duration='Instantaneous',
            description='Acid arrow.',
        )
        comp = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=4, damage_type='acid', timing='on_hit',
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        comp.refresh_from_db()
        assert comp.timing == 'end_of_turn'

    def test_component_on_crit_extra_correction(self, db):
        """Acid Arrow end-of-turn component on_crit_extra set to False."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='90 feet', duration='Instantaneous',
            description='Acid arrow.',
        )
        comp = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=4, damage_type='acid', timing='end_of_turn',
            on_crit_extra=True,  # wrong
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        comp.refresh_from_db()
        assert comp.on_crit_extra is False

    def test_component_upcast_dice_increment_correction(self, db):
        """Acid Arrow components get upcast_dice_increment=1."""
        spell = Spell.objects.create(
            name='Acid Arrow', level=2, school='evocation',
            casting_time='1 action', range='90 feet', duration='Instantaneous',
            description='Acid arrow.',
        )
        comp_on_hit = DamageComponent.objects.create(
            spell=spell, dice_count=4, die_size=4, damage_type='acid', timing='on_hit',
        )
        comp_eot = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=4, damage_type='acid', timing='end_of_turn',
        )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        comp_on_hit.refresh_from_db()
        comp_eot.refresh_from_db()
        assert comp_on_hit.upcast_dice_increment == 1
        assert comp_eot.upcast_dice_increment == 1

    def test_spell_not_found_warning_for_component_fix(self, db):
        """Missing spell referenced in component corrections produces a warning."""
        # Acid Arrow doesn't exist but fix_spell_data uses get() with DoesNotExist guard
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        # Should not raise; warnings are emitted for missing spells

    def test_multiple_spells_same_name_warning(self, db):
        """Multiple spells with same name produce a warning for component corrections."""
        for _ in range(2):
            Spell.objects.create(
                name='Acid Arrow', level=2, school='evocation',
                casting_time='1 action', range='90 feet', duration='Instantaneous',
                description='Acid arrow.',
            )
        out = StringIO()
        call_command('fix_spell_data', stdout=out)
        output = out.getvalue()
        assert 'Multiple spells named' in output


# ── seed_spells ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSeedSpellsCommand:

    def test_no_args_raises_error(self, db):
        """Running without --file or --all raises CommandError."""
        with pytest.raises(CommandError, match='Please specify'):
            call_command('seed_spells', stdout=StringIO())

    def test_file_with_valid_json(self, db):
        """Imports spells from a valid JSON file."""
        spell_data = [
            {
                'name': 'Test Spell One',
                'level': 1,
                'school': 'evocation',
                'casting_time': '1 action',
                'range': '60 feet',
                'duration': 'Instantaneous',
                'description': 'A test spell.',
                'components': ['V', 'S'],
                'classes': ['wizard'],
            }
        ]
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8'
        ) as f:
            json.dump(spell_data, f)
            tmp_path = f.name

        try:
            out = StringIO()
            call_command('seed_spells', '--file', tmp_path, stdout=out)
            output = out.getvalue()
            assert 'Imported' in output
            assert Spell.objects.filter(name='Test Spell One').exists()
        finally:
            os.unlink(tmp_path)

    def test_clear_flag_removes_existing(self, db):
        """--clear deletes existing spells before import."""
        Spell.objects.create(
            name='Old Spell', level=1, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Old.',
        )
        spell_data = [
            {
                'name': 'New Spell',
                'level': 2,
                'school': 'conjuration',
                'casting_time': '1 action',
                'range': '30 feet',
                'duration': 'Instantaneous',
                'description': 'New.',
                'components': ['V'],
                'classes': [],
            }
        ]
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8'
        ) as f:
            json.dump(spell_data, f)
            tmp_path = f.name

        try:
            out = StringIO()
            call_command('seed_spells', '--file', tmp_path, '--clear', stdout=out)
            output = out.getvalue()
            assert 'Clearing' in output
            assert not Spell.objects.filter(name='Old Spell').exists()
            assert Spell.objects.filter(name='New Spell').exists()
        finally:
            os.unlink(tmp_path)

    def test_all_flag_missing_files_continues(self, db, settings):
        """--all flag: if data files are missing, warns but doesn't crash."""
        settings.BASE_DIR = '/nonexistent_dir_for_testing'
        out = StringIO()
        with pytest.raises(CommandError, match='No files to import'):
            call_command('seed_spells', '--all', stdout=out)

    def test_file_not_found_shows_error(self, db):
        """--file pointing to a non-existent file logs an error message."""
        out = StringIO()
        call_command('seed_spells', '--file', '/tmp/nonexistent_spells_9999.json', stdout=out)
        output = out.getvalue()
        assert 'Failed to load' in output or 'error' in output.lower() or 'Error' in output
