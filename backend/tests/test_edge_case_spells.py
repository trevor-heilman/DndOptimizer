"""
Edge-case spell tests.

Verifies that outlier spells — those with non-standard mechanics like multi-component
DoT scaling, auto-hit, multi-beam attack rolls, and zero-damage summoning — are handled
correctly by both the data model and the analysis service.

Covers:
  - Acid Arrow: per-component upcast scaling, DoT ineligibility for crits, half-miss damage
  - Magic Missile: auto-hit, per-attack upcast scaling, force damage
  - Scorching Ray: multi-beam attack rolls, per-slot beam count scaling
  - Summoning spells: no damage components, graceful degradation in analysis
"""
import pytest

from analysis.models import AnalysisContext
from analysis.services import SpellAnalysisService
from spells.models import DamageComponent, Spell


def _make_context(**overrides) -> AnalysisContext:
    """Return an unsaved AnalysisContext with sensible test defaults."""
    defaults = {
        'target_ac': 15,
        'target_save_bonus': 0,
        'spell_save_dc': 15,
        'caster_attack_bonus': 5,
        'number_of_targets': 1,
        'advantage': False,
        'disadvantage': False,
        'spell_slot_level': 2,
        'crit_enabled': True,
        'half_damage_on_save': True,
        'evasion_enabled': False,
        'resistance': False,
    }
    defaults.update(overrides)
    return AnalysisContext(**defaults)


# ─────────────────────────────────────────────────────────────────────────────
# Acid Arrow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAcidArrowModel:
    """DamageComponent field values for Acid Arrow edge-case mechanics."""

    @pytest.fixture
    def acid_arrow(self):
        spell = Spell.objects.create(
            name='Acid Arrow',
            level=2,
            school='evocation',
            is_attack_roll=True,
            half_damage_on_miss=True,
            upcast_base_level=2,
            number_of_attacks=1,
        )
        on_hit = DamageComponent.objects.create(
            spell=spell,
            dice_count=4,
            die_size=4,
            damage_type='acid',
            timing='on_hit',
            on_crit_extra=True,
            upcast_dice_increment=1,
        )
        dot = DamageComponent.objects.create(
            spell=spell,
            dice_count=2,
            die_size=4,
            damage_type='acid',
            timing='end_of_turn',
            on_crit_extra=False,
            upcast_dice_increment=1,
        )
        return spell, on_hit, dot

    def test_two_components_exist(self, acid_arrow):
        spell, _, _ = acid_arrow
        assert spell.damage_components.count() == 2

    def test_on_hit_component_fields(self, acid_arrow):
        _, on_hit, _ = acid_arrow
        assert on_hit.dice_count == 4
        assert on_hit.die_size == 4
        assert on_hit.timing == 'on_hit'
        assert on_hit.on_crit_extra is True
        assert on_hit.upcast_dice_increment == 1

    def test_dot_component_cannot_crit(self, acid_arrow):
        _, _, dot = acid_arrow
        assert dot.timing == 'end_of_turn'
        assert dot.on_crit_extra is False

    def test_dot_component_scales_per_component(self, acid_arrow):
        _, _, dot = acid_arrow
        assert dot.upcast_dice_increment == 1

    def test_half_damage_on_miss_flag(self, acid_arrow):
        spell, _, _ = acid_arrow
        assert spell.half_damage_on_miss is True

    def test_upcast_base_level(self, acid_arrow):
        spell, _, _ = acid_arrow
        assert spell.upcast_base_level == 2


@pytest.mark.django_db
class TestAcidArrowAnalysis:
    """SpellAnalysisService behaviour for Acid Arrow at various slot levels."""

    @pytest.fixture
    def acid_arrow(self):
        spell = Spell.objects.create(
            name='Acid Arrow',
            level=2,
            school='evocation',
            is_attack_roll=True,
            half_damage_on_miss=True,
            upcast_base_level=2,
            number_of_attacks=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=4, die_size=4, damage_type='acid',
            timing='on_hit', on_crit_extra=True, upcast_dice_increment=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=4, damage_type='acid',
            timing='end_of_turn', on_crit_extra=False, upcast_dice_increment=1,
        )
        return spell

    def test_analysis_returns_expected_keys(self, acid_arrow):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(acid_arrow, ctx)
        assert 'expected_damage' in result
        assert 'average_damage' in result
        assert 'spell_type' in result

    def test_spell_type_is_attack_roll(self, acid_arrow):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(acid_arrow, ctx)
        assert result['spell_type'] == 'attack_roll'

    def test_half_on_miss_reflected_in_breakdown(self, acid_arrow):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(acid_arrow, ctx)
        assert result['math_breakdown']['half_on_miss'] is True

    def test_expected_damage_positive(self, acid_arrow):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(acid_arrow, ctx)
        assert result['expected_damage'] > 0

    def test_expected_damage_increases_with_slot(self, acid_arrow):
        ctx2 = _make_context(spell_slot_level=2)
        ctx5 = _make_context(spell_slot_level=5)
        r2 = SpellAnalysisService.analyze_spell(acid_arrow, ctx2)
        r5 = SpellAnalysisService.analyze_spell(acid_arrow, ctx5)
        assert r5['expected_damage'] > r2['expected_damage']


# ─────────────────────────────────────────────────────────────────────────────
# Magic Missile
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMagicMissileModel:
    """DamageComponent and Spell field values for Magic Missile."""

    @pytest.fixture
    def magic_missile(self):
        spell = Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            is_auto_hit=True,
            is_attack_roll=False,
            is_saving_throw=False,
            number_of_attacks=3,
            upcast_attacks_increment=1,
            upcast_base_level=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=4, flat_modifier=1,
            damage_type='force', timing='on_hit', on_crit_extra=False,
        )
        return spell

    def test_is_auto_hit(self, magic_missile):
        assert magic_missile.is_auto_hit is True

    def test_is_not_attack_roll(self, magic_missile):
        assert magic_missile.is_attack_roll is False

    def test_base_attacks(self, magic_missile):
        assert magic_missile.number_of_attacks == 3

    def test_upcast_attacks_increment(self, magic_missile):
        assert magic_missile.upcast_attacks_increment == 1

    def test_force_damage_component(self, magic_missile):
        comp = magic_missile.damage_components.first()
        assert comp is not None
        assert comp.damage_type == 'force'
        assert comp.dice_count == 1
        assert comp.die_size == 4
        assert comp.flat_modifier == 1

    def test_darts_cannot_crit(self, magic_missile):
        """Magic Missile is an auto-hit; crits are irrelevant (on_crit_extra=False)."""
        comp = magic_missile.damage_components.first()
        assert comp.on_crit_extra is False


@pytest.mark.django_db
class TestMagicMissileAnalysis:
    """SpellAnalysisService behaviour for Magic Missile (auto-hit, multi-dart)."""

    @pytest.fixture
    def magic_missile(self):
        spell = Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            is_auto_hit=True,
            is_attack_roll=False,
            is_saving_throw=False,
            number_of_attacks=3,
            upcast_attacks_increment=1,
            upcast_base_level=1,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=4, flat_modifier=1,
            damage_type='force', timing='on_hit', on_crit_extra=False,
        )
        return spell

    def test_analysis_does_not_raise(self, magic_missile):
        ctx = _make_context(spell_slot_level=1)
        result = SpellAnalysisService.analyze_spell(magic_missile, ctx)
        assert result is not None

    def test_average_damage_positive(self, magic_missile):
        ctx = _make_context(spell_slot_level=1)
        result = SpellAnalysisService.analyze_spell(magic_missile, ctx)
        assert result['average_damage'] > 0

    def test_upcasting_increases_average_damage(self, magic_missile):
        """Each slot above 1st adds one dart (1d4+1), so expected damage must grow."""
        ctx1 = _make_context(spell_slot_level=1)
        ctx3 = _make_context(spell_slot_level=3)
        r1 = SpellAnalysisService.analyze_spell(magic_missile, ctx1)
        r3 = SpellAnalysisService.analyze_spell(magic_missile, ctx3)
        assert r3['average_damage'] > r1['average_damage']


# ─────────────────────────────────────────────────────────────────────────────
# Scorching Ray
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestScorchingRayModel:
    """Spell-level field values for Scorching Ray."""

    @pytest.fixture
    def scorching_ray(self):
        spell = Spell.objects.create(
            name='Scorching Ray',
            level=2,
            school='evocation',
            is_attack_roll=True,
            number_of_attacks=3,
            upcast_attacks_increment=1,
            upcast_base_level=2,
            tags=['damage', 'fire'],
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=6,
            damage_type='fire', timing='on_hit', on_crit_extra=True,
        )
        return spell

    def test_is_attack_roll(self, scorching_ray):
        assert scorching_ray.is_attack_roll is True

    def test_base_ray_count(self, scorching_ray):
        assert scorching_ray.number_of_attacks == 3

    def test_upcast_ray_increment(self, scorching_ray):
        assert scorching_ray.upcast_attacks_increment == 1

    def test_upcast_base_level(self, scorching_ray):
        assert scorching_ray.upcast_base_level == 2

    def test_no_summoning_tag(self, scorching_ray):
        assert 'summoning' not in (scorching_ray.tags or [])

    def test_fire_component_can_crit(self, scorching_ray):
        comp = scorching_ray.damage_components.first()
        assert comp.on_crit_extra is True


@pytest.mark.django_db
class TestScorchingRayAnalysis:
    """SpellAnalysisService handles multi-beam upcasting correctly."""

    @pytest.fixture
    def scorching_ray(self):
        spell = Spell.objects.create(
            name='Scorching Ray',
            level=2,
            school='evocation',
            is_attack_roll=True,
            number_of_attacks=3,
            upcast_attacks_increment=1,
            upcast_base_level=2,
        )
        DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=6,
            damage_type='fire', timing='on_hit', on_crit_extra=True,
        )
        return spell

    def test_analysis_returns_attack_roll_type(self, scorching_ray):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(scorching_ray, ctx)
        assert result['spell_type'] == 'attack_roll'

    def test_expected_damage_positive(self, scorching_ray):
        ctx = _make_context(spell_slot_level=2)
        result = SpellAnalysisService.analyze_spell(scorching_ray, ctx)
        assert result['expected_damage'] > 0

    def test_upcasting_adds_rays(self, scorching_ray):
        """Slot 5 gives 3 + (5-2) = 6 rays, which should roughly double expected damage."""
        ctx2 = _make_context(spell_slot_level=2)
        ctx5 = _make_context(spell_slot_level=5)
        r2 = SpellAnalysisService.analyze_spell(scorching_ray, ctx2)
        r5 = SpellAnalysisService.analyze_spell(scorching_ray, ctx5)
        assert r5['expected_damage'] > r2['expected_damage']
        # 6 rays vs 3 rays → exactly 2× expected damage (same hit probability)
        assert abs(r5['expected_damage'] / r2['expected_damage'] - 2.0) < 0.01


# ─────────────────────────────────────────────────────────────────────────────
# Summoning spells (no damage components)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSummoningSpellModel:
    """Summoning spells have no damage components and no combat flags."""

    @pytest.fixture
    def conjure_animals(self):
        return Spell.objects.create(
            name='Conjure Animals',
            level=3,
            school='conjuration',
            is_attack_roll=False,
            is_saving_throw=False,
            is_auto_hit=False,
            tags=['summoning'],
        )

    def test_no_damage_components(self, conjure_animals):
        assert conjure_animals.damage_components.count() == 0

    def test_not_classified_as_damage_spell(self, conjure_animals):
        assert conjure_animals.is_attack_roll is False
        assert conjure_animals.is_saving_throw is False
        assert conjure_animals.is_auto_hit is False

    def test_summoning_tag_present(self, conjure_animals):
        assert 'summoning' in (conjure_animals.tags or [])


@pytest.mark.django_db
class TestSummoningSpellAnalysis:
    """SpellAnalysisService degrades gracefully for spells without damage components."""

    @pytest.fixture
    def conjure_animals(self):
        return Spell.objects.create(
            name='Conjure Animals',
            level=3,
            school='conjuration',
            is_attack_roll=False,
            is_saving_throw=False,
            is_auto_hit=False,
            tags=['summoning'],
        )

    def test_analysis_does_not_raise(self, conjure_animals):
        """Analyzing a spell with no damage components must not raise an exception."""
        ctx = _make_context(spell_slot_level=3)
        result = SpellAnalysisService.analyze_spell(conjure_animals, ctx)
        assert result is not None

    def test_expected_damage_is_zero(self, conjure_animals):
        ctx = _make_context(spell_slot_level=3)
        result = SpellAnalysisService.analyze_spell(conjure_animals, ctx)
        assert result['expected_damage'] == 0

    def test_average_damage_is_zero(self, conjure_animals):
        ctx = _make_context(spell_slot_level=3)
        result = SpellAnalysisService.analyze_spell(conjure_animals, ctx)
        assert result['average_damage'] == 0
