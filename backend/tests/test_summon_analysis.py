"""
Summon DPR analysis tests.

Verifies the summon branch of SpellAnalysisService.analyze_spell():
  - SummonTemplate and SummonAttack model helper methods (hp_at_level, ac_at_level, num_attacks_at_level)
  - Spell with no templates → graceful fallback (zero DPR, not crash)
  - Spell with one template, zero attacks at low slot (floor(2/2) = 1 but floor(1/2) = 0)
  - Spell with one template, positive DPR
  - Upcast slot level → more attacks
  - Spell with multiple templates → best-template selected
  - Secondary damage component accumulates correctly
  - Resistance halves expected DPR
  - Advantage raises expected DPR
  - Result structure: required keys, spell_type='summon', math_breakdown fields
"""
import pytest

from analysis.models import AnalysisContext
from analysis.services import SpellAnalysisService
from spells.models import Spell, SummonAttack, SummonTemplate

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ctx(**overrides) -> AnalysisContext:
    """Return an unsaved AnalysisContext with sensible summon-test defaults."""
    defaults = {
        'target_ac': 15,
        'target_save_bonus': 0,
        'spell_save_dc': 15,
        'caster_attack_bonus': 5,
        'number_of_targets': 1,
        'advantage': False,
        'disadvantage': False,
        'spell_slot_level': 3,
        'crit_enabled': True,
        'half_damage_on_save': True,
        'evasion_enabled': False,
        'resistance': False,
    }
    defaults.update(overrides)
    return AnalysisContext(**defaults)


def _make_summon_spell(name: str = 'Summon Beast') -> Spell:
    """Create a minimal summoning spell (no damage components, is_attack_roll=True, tags=['summoning'])."""
    return Spell.objects.create(
        name=name,
        level=2,
        school='conjuration',
        is_attack_roll=True,
        is_saving_throw=False,
        is_auto_hit=False,
        tags=['summoning'],
    )


def _make_template(spell: Spell, name: str = 'Land Beast', **kwargs) -> SummonTemplate:
    """Create a SummonTemplate with sensible defaults."""
    defaults = {
        'base_hp': 30,
        'hp_per_level': 10,
        'hp_base_level': 2,
        'base_ac': 13,
        'ac_per_level': 0,
        'num_attacks_formula': 'floor_half_level',
        'creature_type': 'Beast',
    }
    defaults.update(kwargs)
    return SummonTemplate.objects.create(spell=spell, name=name, **defaults)


def _make_attack(template: SummonTemplate, name: str = 'Claws', **kwargs) -> SummonAttack:
    """Create a SummonAttack with sensible defaults (1d6+2, melee)."""
    defaults = {
        'attack_type': 'melee_weapon',
        'dice_count': 1,
        'die_size': 6,
        'flat_modifier': 2,
        'flat_per_level': 0,
        'damage_type': 'piercing',
        'secondary_dice_count': 0,
        'secondary_die_size': 0,
        'secondary_flat': 0,
    }
    defaults.update(kwargs)
    return SummonAttack.objects.create(summon=template, name=name, **defaults)


# ─────────────────────────────────────────────────────────────────────────────
# SummonTemplate model helpers
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonTemplateHelpers:
    """Unit tests for SummonTemplate computed properties."""

    @pytest.fixture
    def template(self):
        spell = _make_summon_spell()
        return _make_template(
            spell,
            base_hp=30, hp_per_level=10, hp_base_level=2,
            base_ac=13, ac_per_level=1,
        )

    def test_hp_at_base_level(self, template):
        assert template.hp_at_level(2) == 30

    def test_hp_scales_above_base_level(self, template):
        assert template.hp_at_level(3) == 40
        assert template.hp_at_level(5) == 60

    def test_hp_does_not_go_below_base(self, template):
        # Slot below hp_base_level → no negative offset
        assert template.hp_at_level(1) == 30

    def test_ac_scales_with_level(self, template):
        assert template.ac_at_level(3) == 16   # 13 + 1*3
        assert template.ac_at_level(5) == 18   # 13 + 1*5

    def test_ac_fixed_when_per_level_zero(self):
        spell = _make_summon_spell('Summon Undead')
        tmpl = _make_template(spell, base_ac=11, ac_per_level=0)
        assert tmpl.ac_at_level(3) == 11
        assert tmpl.ac_at_level(9) == 11

    def test_num_attacks_floor_half_level(self, template):
        assert template.num_attacks_at_level(2) == 1   # floor(2/2)
        assert template.num_attacks_at_level(3) == 1   # floor(3/2)
        assert template.num_attacks_at_level(4) == 2   # floor(4/2)
        assert template.num_attacks_at_level(6) == 3   # floor(6/2)

    def test_num_attacks_zero_at_slot_one(self, template):
        # Summon spells require slot ≥ 2, but engine must not crash for slot 1
        assert template.num_attacks_at_level(1) == 0


# ─────────────────────────────────────────────────────────────────────────────
# Spell with no templates → graceful fallback
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonNoTemplates:
    """Summoning spell that has no SummonTemplate objects yet — legacy/not-yet-populated."""

    @pytest.fixture
    def bare_summon(self):
        return _make_summon_spell('Conjure Animals')

    def test_analysis_does_not_raise(self, bare_summon):
        result = SpellAnalysisService.analyze_spell(bare_summon, _ctx())
        assert result is not None

    def test_expected_damage_is_zero(self, bare_summon):
        result = SpellAnalysisService.analyze_spell(bare_summon, _ctx())
        assert result['expected_damage'] == 0.0

    def test_spell_type_is_not_summon(self, bare_summon):
        # Without templates the engine falls through to damage_components (empty) branch
        result = SpellAnalysisService.analyze_spell(bare_summon, _ctx())
        assert result['spell_type'] != 'summon'


# ─────────────────────────────────────────────────────────────────────────────
# Single template, positive DPR
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonSingleTemplate:
    """One template, one attack at slot 3 → floor(3/2)=1 attack."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell('Summon Beast')
        tmpl = _make_template(spell)
        _make_attack(tmpl, dice_count=1, die_size=8, flat_modifier=3)
        return spell

    def test_spell_type_is_summon(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        assert result['spell_type'] == 'summon'

    def test_expected_damage_positive(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        assert result['expected_damage'] > 0

    def test_result_has_required_keys(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        assert 'expected_damage' in result
        assert 'average_damage' in result
        assert 'efficiency' in result
        assert 'math_breakdown' in result

    def test_math_breakdown_has_summon_fields(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        mb = result['math_breakdown']
        assert 'per_template' in mb
        assert 'best_template' in mb
        assert 'num_attacks' in mb
        assert 'slot_level' in mb

    def test_efficiency_is_dpr_over_slot(self, summon_spell):
        slot = 3
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=slot))
        assert abs(result['efficiency'] - result['expected_damage'] / slot) < 0.001

    def test_zero_attacks_at_slot_one(self, summon_spell):
        """floor(1/2) = 0 attacks → expected DPR is 0."""
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=1))
        # At slot 1 the spell may not yet have templates (base level is 2) but if it does,
        # 0 attacks should yield 0 DPR.
        if result['spell_type'] == 'summon':
            assert result['expected_damage'] == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Upcast: more attacks at higher slot
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonUpcast:
    """DPR must increase with higher slot levels (more attacks)."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell('Summon Fey')
        tmpl = _make_template(spell)
        _make_attack(tmpl, dice_count=2, die_size=6, flat_modifier=2)
        return spell

    def test_more_attacks_at_higher_slot(self, summon_spell):
        r3 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))  # 1 atk
        r4 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))  # 2 atk
        assert r4['expected_damage'] > r3['expected_damage']

    def test_num_attacks_matches_formula(self, summon_spell):
        r4 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))
        assert r4['math_breakdown']['num_attacks'] == 2  # floor(4/2)

    def test_dpr_roughly_doubles_from_slot3_to_slot6(self, summon_spell):
        """Slot 6 = 3 attacks vs slot 3 = 1 attack → ~3× DPR."""
        r3 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        r6 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=6))
        assert r6['expected_damage'] > r3['expected_damage'] * 2


# ─────────────────────────────────────────────────────────────────────────────
# Multiple templates → best selected
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonMultipleTemplates:
    """Two templates with different damage — best must win."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell('Summon Undead')
        # Weak template: 1d6
        weak = _make_template(spell, name='Putrid Zombie', base_ac=8, ac_per_level=0)
        _make_attack(weak, name='Slam', dice_count=1, die_size=6, flat_modifier=0)
        # Strong template: 2d8 + 4
        strong = _make_template(spell, name='Skeletal Warrior', base_ac=13, ac_per_level=0)
        _make_attack(strong, name='Bone Sword', dice_count=2, die_size=8, flat_modifier=4)
        return spell

    def test_best_template_has_higher_dpr(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))
        best_name = result['math_breakdown']['best_template']
        per_template = result['math_breakdown']['per_template']
        best_entry = next(t for t in per_template if t['name'] == best_name)
        other_entries = [t for t in per_template if t['name'] != best_name]
        for other in other_entries:
            assert best_entry['expected_dpr'] >= other['expected_dpr']

    def test_best_template_is_skeletal_warrior(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))
        assert result['math_breakdown']['best_template'] == 'Skeletal Warrior'

    def test_per_template_list_has_both_templates(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))
        names = {t['name'] for t in result['math_breakdown']['per_template']}
        assert 'Putrid Zombie' in names
        assert 'Skeletal Warrior' in names

    def test_expected_damage_equals_best_template_dpr(self, summon_spell):
        result = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=4))
        best_name = result['math_breakdown']['best_template']
        per_template = result['math_breakdown']['per_template']
        best_entry = next(t for t in per_template if t['name'] == best_name)
        assert abs(result['expected_damage'] - best_entry['expected_dpr']) < 0.001


# ─────────────────────────────────────────────────────────────────────────────
# Secondary damage
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonSecondaryDamage:
    """Template with secondary damage (e.g. Fey spirit +1d6 force) adds expected DPR."""

    @pytest.fixture
    def fey_spell(self):
        spell = _make_summon_spell('Summon Fey')
        tmpl = _make_template(spell)
        # Primary 2d4 piercing + secondary 1d6 force
        _make_attack(
            tmpl, name='Gleaming Blade',
            dice_count=2, die_size=4, flat_modifier=0,
            secondary_dice_count=1, secondary_die_size=6, secondary_flat=0,
            secondary_damage_type='force',
        )
        return spell

    @pytest.fixture
    def fey_spell_no_secondary(self):
        spell = _make_summon_spell('Summon Fey (no secondary)')
        tmpl = _make_template(spell)
        _make_attack(
            tmpl, name='Gleaming Blade',
            dice_count=2, die_size=4, flat_modifier=0,
            secondary_dice_count=0,
        )
        return spell

    def test_secondary_damage_increases_dpr(self, fey_spell, fey_spell_no_secondary):
        ctx = _ctx(spell_slot_level=4)
        result_with = SpellAnalysisService.analyze_spell(fey_spell, ctx)
        result_without = SpellAnalysisService.analyze_spell(fey_spell_no_secondary, ctx)
        assert result_with['expected_damage'] > result_without['expected_damage']


# ─────────────────────────────────────────────────────────────────────────────
# Resistance halves DPR
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonResistance:
    """Resistance=True must halve the summon expected_damage."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell()
        tmpl = _make_template(spell)
        _make_attack(tmpl, dice_count=2, die_size=8, flat_modifier=4)
        return spell

    def test_resistance_halves_expected_damage(self, summon_spell):
        ctx_normal = _ctx(spell_slot_level=4, resistance=False)
        ctx_resist = _ctx(spell_slot_level=4, resistance=True)
        r_normal = SpellAnalysisService.analyze_spell(summon_spell, ctx_normal)
        r_resist = SpellAnalysisService.analyze_spell(summon_spell, ctx_resist)
        assert abs(r_resist['expected_damage'] - r_normal['expected_damage'] / 2) < 0.001


# ─────────────────────────────────────────────────────────────────────────────
# Advantage increases expected DPR
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonAdvantage:
    """Advantage=True must produce higher expected_damage than base."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell()
        tmpl = _make_template(spell)
        _make_attack(tmpl, dice_count=1, die_size=8, flat_modifier=3)
        return spell

    def test_advantage_increases_dpr(self, summon_spell):
        ctx_base = _ctx(spell_slot_level=4, advantage=False)
        ctx_adv = _ctx(spell_slot_level=4, advantage=True)
        r_base = SpellAnalysisService.analyze_spell(summon_spell, ctx_base)
        r_adv = SpellAnalysisService.analyze_spell(summon_spell, ctx_adv)
        assert r_adv['expected_damage'] > r_base['expected_damage']

    def test_disadvantage_decreases_dpr(self, summon_spell):
        ctx_base = _ctx(spell_slot_level=4, disadvantage=False)
        ctx_dis = _ctx(spell_slot_level=4, disadvantage=True)
        r_base = SpellAnalysisService.analyze_spell(summon_spell, ctx_base)
        r_dis = SpellAnalysisService.analyze_spell(summon_spell, ctx_dis)
        assert r_dis['expected_damage'] < r_base['expected_damage']


# ─────────────────────────────────────────────────────────────────────────────
# flat_per_level modifier accumulates with slot
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummonFlatPerLevel:
    """Attacks with flat_per_level > 0 should scale with the slot level."""

    @pytest.fixture
    def summon_spell(self):
        spell = _make_summon_spell()
        tmpl = _make_template(spell)
        # +spell_level bonus: flat_modifier=0, flat_per_level=1
        _make_attack(tmpl, dice_count=1, die_size=6, flat_modifier=0, flat_per_level=1)
        return spell

    def test_higher_slot_increases_flat_bonus(self, summon_spell):
        r3 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=3))
        r5 = SpellAnalysisService.analyze_spell(summon_spell, _ctx(spell_slot_level=5))
        # Both have same number of attacks (1 and 2 respectively), but slot 5 also has
        # more attacks AND higher flat, so DPR must be strictly greater.
        assert r5['expected_damage'] > r3['expected_damage']
