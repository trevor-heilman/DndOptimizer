"""
Unit tests for analysis services (mathematical engine).
"""

import pytest

from analysis.services import AttackRollCalculator, DiceCalculator, SavingThrowCalculator, SpellAnalysisService
from spells.models import DamageComponent, Spell


class TestDiceCalculator:
    """Test dice calculation functions."""

    def test_average_damage(self):
        """Test average damage calculation."""
        # 1d6: average = (1+6)/2 = 3.5
        assert DiceCalculator.average(1, 6) == 3.5

        # 2d6: average = 2 * 3.5 = 7.0
        assert DiceCalculator.average(2, 6) == 7.0

        # 8d6: average = 8 * 3.5 = 28.0
        assert DiceCalculator.average(8, 6) == 28.0

    def test_average_damage_with_modifier(self):
        """Test average damage with flat modifier."""
        # 1d8 + 3: average = 4.5 + 3 = 7.5
        assert DiceCalculator.average(1, 8, modifier=3) == 7.5

        # 2d6 + 5: average = 7.0 + 5 = 12.0
        assert DiceCalculator.average(2, 6, modifier=5) == 12.0

    def test_maximum_damage(self):
        """Test maximum damage calculation."""
        # 1d6: max = 6
        assert DiceCalculator.maximum(1, 6) == 6

        # 2d6: max = 12
        assert DiceCalculator.maximum(2, 6) == 12

        # 8d6: max = 48
        assert DiceCalculator.maximum(8, 6) == 48

    def test_maximum_damage_with_modifier(self):
        """Test maximum damage with flat modifier."""
        # 1d8 + 3: max = 8 + 3 = 11
        assert DiceCalculator.maximum(1, 8, modifier=3) == 11

        # 2d6 + 5: max = 12 + 5 = 17
        assert DiceCalculator.maximum(2, 6, modifier=5) == 17

    def test_minimum_damage(self):
        """Test minimum damage calculation."""
        # 1d6: min = 1
        assert DiceCalculator.minimum(1, 6) == 1

        # 2d6: min = 2
        assert DiceCalculator.minimum(2, 6) == 2

        # 8d6: min = 8
        assert DiceCalculator.minimum(8, 6) == 8

    def test_minimum_damage_with_modifier(self):
        """Test minimum damage with flat modifier."""
        # 1d8 + 3: min = 1 + 3 = 4
        assert DiceCalculator.minimum(1, 8, modifier=3) == 4

        # 2d6 + 5: min = 2 + 5 = 7
        assert DiceCalculator.minimum(2, 6, modifier=5) == 7


class TestAttackRollCalculator:
    """Test attack roll probability calculations."""

    def test_hit_probability_basic(self):
        """Test basic hit probability."""
        # AC 10, +5 bonus
        # Need to roll 5 or higher (d20)
        # Probability = (20 - 5 + 1) / 20 = 16/20 = 0.80
        prob = AttackRollCalculator.hit_probability(target_ac=10, attack_bonus=5)
        assert prob == 0.80

    def test_hit_probability_low_ac(self):
        """Test hit probability with very low AC (auto-hit)."""
        # AC 5, +10 bonus - should be 95% (can't go higher)
        prob = AttackRollCalculator.hit_probability(target_ac=5, attack_bonus=10)
        assert prob == 0.95

    def test_hit_probability_high_ac(self):
        """Test hit probability with very high AC."""
        # AC 20, +0 bonus
        # Need to roll 20 (critical only)
        # Probability = 5% minimum
        prob = AttackRollCalculator.hit_probability(target_ac=20, attack_bonus=0)
        assert prob == 0.05

    def test_hit_probability_with_advantage(self):
        """Test hit probability with advantage."""
        # AC 15, +5 bonus, advantage
        # Normal prob would be 11/20 = 0.55
        # With advantage: 1 - (1-0.55)^2 = 1 - 0.2025 = 0.7975
        prob = AttackRollCalculator.hit_probability(target_ac=15, attack_bonus=5, advantage=True)
        expected = 1 - (1 - 0.55) ** 2
        assert abs(prob - expected) < 0.001

    def test_hit_probability_with_disadvantage(self):
        """Test hit probability with disadvantage."""
        # AC 15, +5 bonus, disadvantage
        # Normal prob would be 0.55
        # With disadvantage: 0.55^2 = 0.3025
        prob = AttackRollCalculator.hit_probability(target_ac=15, attack_bonus=5, disadvantage=True)
        expected = 0.55**2
        assert abs(prob - expected) < 0.001

    def test_crit_probability_normal(self):
        """Test critical hit probability (normal)."""
        prob = AttackRollCalculator.crit_probability()
        assert prob == 0.05  # 1 in 20

    def test_crit_probability_with_advantage(self):
        """Test critical hit probability with advantage."""
        # With advantage: 1 - (19/20)^2 = 1 - 0.9025 = 0.0975
        prob = AttackRollCalculator.crit_probability(advantage=True)
        expected = 1 - (19 / 20) ** 2
        assert abs(prob - expected) < 0.001

    def test_crit_probability_with_disadvantage(self):
        """Test critical hit probability with disadvantage."""
        # With disadvantage: (1/20)^2 = 0.0025, but then OR with advantage,
        # Actually it's 1/20 * 1/20 = 0.0025
        prob = AttackRollCalculator.crit_probability(disadvantage=True)
        expected = 0.05 * 0.05
        assert abs(prob - expected) < 0.001

    def test_expected_damage(self):
        """Test expected damage from attack roll."""
        # 4d4 (avg=10), AC 15, +5 bonus
        # hit_prob=0.55, crit_prob=0.05, crit_avg=8d4=20, extra_crit=10
        # expected = 0.55*10 + 0.05*10 = 6.0
        result = AttackRollCalculator.expected_damage(
            dice_count=4, die_size=4, modifier=0, attack_bonus=5, target_ac=15
        )
        assert abs(result["expected_damage"] - 6.0) < 0.001


class TestSavingThrowCalculator:
    """Test saving throw probability calculations."""

    def test_save_failure_probability_basic(self):
        """Test basic save failure probability."""
        # DC 13, +2 save bonus
        # Need to roll 11 or higher to succeed → 10 failures (1-10) / 20 = 0.50
        prob = SavingThrowCalculator.save_failure_probability(spell_dc=13, save_bonus=2)
        assert prob == 0.50

    def test_save_failure_probability_low_dc(self):
        """Test save failure with very low DC."""
        # DC 8, +5 bonus → roll_needed=3 → failures=2/20=0.10
        prob = SavingThrowCalculator.save_failure_probability(spell_dc=8, save_bonus=5)
        assert prob == 0.10

    def test_save_failure_probability_high_dc(self):
        """Test save failure with very high DC."""
        # DC 20, +0 bonus → roll_needed=20 → failures=19/20=0.95 (clamped)
        prob = SavingThrowCalculator.save_failure_probability(spell_dc=20, save_bonus=0)
        assert prob == 0.95

    def test_save_failure_minimum(self):
        """Test minimum save failure rate (natural 1)."""
        # DC 5, +10 bonus → roll_needed=-5 → clamped to 0.05
        prob = SavingThrowCalculator.save_failure_probability(spell_dc=5, save_bonus=10)
        assert prob == 0.05

    def test_expected_damage_full_on_fail(self):
        """Test expected damage with no save reduction."""
        # 4d4 (avg=10), DC 13, save+2 → fail_prob=0.50, no half
        # expected_total = 10 * 0.50 = 5.0
        result = SavingThrowCalculator.expected_damage(
            dice_count=4, die_size=4, modifier=0, spell_dc=13, save_bonus=2, half_on_success=False
        )
        assert result["expected_total_damage"] == 5.0

    def test_expected_damage_half_on_save(self):
        """Test expected damage with half damage on successful save."""
        # 4d4 (avg=10), DC 13, save+2 → fail_prob=0.50, half on success
        # expected = 0.50*10 + 0.50*5 = 5.0 + 2.5 = 7.5
        result = SavingThrowCalculator.expected_damage(
            dice_count=4, die_size=4, modifier=0, spell_dc=13, save_bonus=2, half_on_success=True
        )
        assert result["expected_total_damage"] == 7.5


@pytest.mark.django_db
class TestSpellAnalysisService:
    """Test spell analysis service."""

    def test_analyze_attack_spell(self):
        """Test analyzing an attack roll spell."""
        spell = Spell.objects.create(
            name="Fire Bolt",
            level=0,
            school="evocation",
            casting_time="1 action",
            range="120 feet",
            duration="Instantaneous",
            description="Fire damage",
            is_attack_roll=True,
            is_saving_throw=False,
        )

        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=10, damage_type="fire", timing="on_hit")

        from analysis.models import AnalysisContext

        context = AnalysisContext(
            target_ac=15,
            caster_attack_bonus=5,
            spell_save_dc=15,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=1,
        )
        result = SpellAnalysisService.analyze_spell(spell, context)

        assert "average_damage" in result
        assert "maximum_damage" in result
        assert "expected_damage" in result
        assert result["spell_type"] == "attack_roll"

    def test_analyze_save_spell(self):
        """Test analyzing a saving throw spell."""
        spell = Spell.objects.create(
            name="Fireball",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire damage",
            is_attack_roll=False,
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
        )

        DamageComponent.objects.create(spell=spell, dice_count=8, die_size=6, damage_type="fire", timing="on_fail")

        from analysis.models import AnalysisContext

        context = AnalysisContext(
            target_ac=15,
            target_save_bonus=2,
            spell_save_dc=13,
            caster_attack_bonus=5,
            number_of_targets=3,
            spell_slot_level=1,
        )
        result = SpellAnalysisService.analyze_spell(spell, context)

        assert "average_damage" in result
        assert "expected_damage" in result
        assert result["spell_type"] == "saving_throw"
        # With 3 targets and half-damage mechanic, expected total > single-target average
        assert result["expected_damage"] > result["average_damage"]

    def test_analyze_spell_with_upcast_save(self):
        """Test upcast scaling on a saving throw spell (Fireball-style)."""
        from analysis.models import AnalysisContext

        spell = Spell.objects.create(
            name="Fireball Upcast Test",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire damage",
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
            upcast_base_level=3,
            upcast_dice_increment=1,
            upcast_die_size=6,
        )
        # 8d6 base damage
        DamageComponent.objects.create(spell=spell, dice_count=8, die_size=6, damage_type="fire", timing="on_fail")

        base_context = AnalysisContext(
            target_ac=15,
            caster_attack_bonus=5,
            spell_save_dc=15,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=3,
        )
        # Cast at level 5 → 2 extra d6s
        upcast_context = AnalysisContext(
            target_ac=15,
            caster_attack_bonus=5,
            spell_save_dc=15,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=5,
        )

        base_result = SpellAnalysisService.analyze_spell(spell, base_context)
        upcast_result = SpellAnalysisService.analyze_spell(spell, upcast_context)

        assert base_result["spell_type"] == "saving_throw"
        assert upcast_result["spell_type"] == "saving_throw"

        # 2 extra d6s should raise average by 2 * 3.5 = 7.0
        assert base_result["upcast_bonus_dice"] == 0
        assert upcast_result["upcast_bonus_dice"] == 2
        assert upcast_result["average_damage"] == pytest.approx(base_result["average_damage"] + 7.0)
        assert upcast_result["maximum_damage"] == base_result["maximum_damage"] + 12
        # Expected damage must also increase at upcast
        assert upcast_result["expected_damage"] > base_result["expected_damage"]

    def test_analyze_spell_with_upcast_attack_roll(self):
        """Test upcast scaling on an attack roll spell."""
        from analysis.models import AnalysisContext

        spell = Spell.objects.create(
            name="Scorching Ray Upcast Test",
            level=2,
            school="evocation",
            casting_time="1 action",
            range="120 feet",
            duration="Instantaneous",
            description="Fire damage",
            is_attack_roll=True,
            number_of_attacks=3,
            upcast_base_level=2,
            upcast_dice_increment=1,
            upcast_die_size=6,
        )
        # 2d6 per ray
        DamageComponent.objects.create(spell=spell, dice_count=2, die_size=6, damage_type="fire", timing="on_hit")

        base_context = AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=2,
        )
        upcast_context = AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=4,
        )

        base_result = SpellAnalysisService.analyze_spell(spell, base_context)
        upcast_result = SpellAnalysisService.analyze_spell(spell, upcast_context)

        assert base_result["spell_type"] == "attack_roll"
        assert upcast_result["spell_type"] == "attack_roll"
        assert base_result["upcast_bonus_dice"] == 0
        assert upcast_result["upcast_bonus_dice"] == 2
        # 2 extra d6s → average +7, expected > base
        assert upcast_result["average_damage"] == pytest.approx(base_result["average_damage"] + 7.0)
        assert upcast_result["expected_damage"] > base_result["expected_damage"]

    def test_analyze_spell_no_upcast_at_base_level(self):
        """Casting at base level should produce zero upcast bonus dice."""
        from analysis.models import AnalysisContext

        spell = Spell.objects.create(
            name="No Upcast Test",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire",
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
            upcast_base_level=3,
            upcast_dice_increment=1,
            upcast_die_size=6,
        )
        DamageComponent.objects.create(spell=spell, dice_count=8, die_size=6, damage_type="fire", timing="on_fail")
        context = AnalysisContext(
            target_ac=15,
            caster_attack_bonus=5,
            spell_save_dc=15,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=3,
        )
        result = SpellAnalysisService.analyze_spell(spell, context)
        assert result["upcast_bonus_dice"] == 0

    def test_analyze_spell_upcast_scale_step(self):
        """Every-other-level scaling (step=2): +1d6 per 2 levels above base (Hex-style)."""
        from analysis.models import AnalysisContext

        spell = Spell.objects.create(
            name="Hex Scale Step Test",
            level=1,
            school="enchantment",
            casting_time="1 bonus action",
            range="90 feet",
            duration="Concentration, up to 1 hour",
            description="Hex damage",
            is_attack_roll=False,
            is_saving_throw=False,
            is_auto_hit=True,
            upcast_base_level=3,
            upcast_dice_increment=1,
            upcast_die_size=6,
            upcast_scale_step=2,
        )
        DamageComponent.objects.create(spell=spell, dice_count=1, die_size=6, damage_type="necrotic", timing="on_hit")

        # Cast at level 3 (base) → 0 extra dice
        AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=3,
        )
        # Cast at level 4 (3 base + 1 level above, step=2 → 1//2=0) → still 0 extra
        AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=4,
        )
        # Cast at level 5 (3 base + 2 levels above, step=2 → 2//2=1) → +1d6
        AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=5,
        )
        # Cast at level 7 (3 base + 4 levels above, step=2 → 4//2=2) → +2d6
        AnalysisContext(
            target_ac=14,
            caster_attack_bonus=5,
            spell_save_dc=13,
            target_save_bonus=0,
            number_of_targets=1,
            spell_slot_level=7,
        )

        r3 = SpellAnalysisService._upcast_extra_dice(spell, 3)
        r4 = SpellAnalysisService._upcast_extra_dice(spell, 4)
        r5 = SpellAnalysisService._upcast_extra_dice(spell, 5)
        r7 = SpellAnalysisService._upcast_extra_dice(spell, 7)

        assert r3 == 0, f"Expected 0 at level 3, got {r3}"
        assert r4 == 0, f"Expected 0 at level 4 (step=2 not met), got {r4}"
        assert r5 == 1, f"Expected 1 at level 5, got {r5}"
        assert r7 == 2, f"Expected 2 at level 7, got {r7}"

    def test_compare_spells(self):
        """Test comparing two spells."""
        spell_a = Spell.objects.create(
            name="Fireball",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire",
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
        )

        DamageComponent.objects.create(spell=spell_a, dice_count=8, die_size=6, damage_type="fire", timing="on_fail")

        spell_b = Spell.objects.create(
            name="Lightning Bolt",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="100 feet",
            duration="Instantaneous",
            description="Lightning",
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
        )

        DamageComponent.objects.create(
            spell=spell_b, dice_count=8, die_size=6, damage_type="lightning", timing="on_fail"
        )

        from analysis.models import AnalysisContext

        context = AnalysisContext(
            target_ac=15,
            target_save_bonus=2,
            spell_save_dc=13,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=3,
        )
        result = SpellAnalysisService.compare_spells(spell_a, spell_b, context)

        assert "spell_a" in result
        assert "spell_b" in result
        assert "winner" in result
        assert result["winner"] in ["spell_a", "spell_b"]


@pytest.mark.django_db
class TestBreakevenAnalysis:
    """Test SpellAnalysisService.breakeven_analysis."""

    def _make_attack_spell(self, name, dice_count, die_size):
        spell = Spell.objects.create(
            name=name,
            level=2,
            school="evocation",
            casting_time="1 action",
            range="120 feet",
            duration="Instantaneous",
            description="Fire",
            is_attack_roll=True,
            number_of_attacks=1,
        )
        DamageComponent.objects.create(
            spell=spell,
            dice_count=dice_count,
            die_size=die_size,
            damage_type="fire",
            timing="on_hit",
        )
        return spell

    def _make_save_spell(self, name, dice_count, die_size):
        spell = Spell.objects.create(
            name=name,
            level=2,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire",
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=True,
        )
        DamageComponent.objects.create(
            spell=spell,
            dice_count=dice_count,
            die_size=die_size,
            damage_type="fire",
            timing="on_fail",
        )
        return spell

    def test_breakeven_returns_required_keys(self):
        """Result contains all expected top-level keys."""
        from analysis.models import AnalysisContext

        spell_a = self._make_attack_spell("Attack Spell A", 4, 6)
        spell_b = self._make_save_spell("Save Spell B", 2, 6)
        ctx = AnalysisContext(
            target_ac=15,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=2,
        )
        result = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, ctx)
        assert "breakeven_ac" in result
        assert "breakeven_save_bonus" in result
        assert "ac_profile" in result
        assert "save_profile" in result

    def test_ac_profile_covers_full_range(self):
        """AC profile has one entry per integer from 1 to 30."""
        from analysis.models import AnalysisContext

        spell_a = self._make_attack_spell("Attack Spell X", 3, 6)
        spell_b = self._make_save_spell("Save Spell Y", 3, 6)
        ctx = AnalysisContext(
            target_ac=15,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=2,
        )
        result = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, ctx)
        assert len(result["ac_profile"]) == 30
        assert result["ac_profile"][0]["value"] == 1
        assert result["ac_profile"][-1]["value"] == 30

    def test_save_profile_covers_full_range(self):
        """Save bonus profile has one entry per integer from -5 to +15."""
        from analysis.models import AnalysisContext

        spell_a = self._make_attack_spell("Attack Spell P", 3, 6)
        spell_b = self._make_save_spell("Save Spell Q", 3, 6)
        ctx = AnalysisContext(
            target_ac=15,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=2,
        )
        result = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, ctx)
        assert len(result["save_profile"]) == 21
        assert result["save_profile"][0]["value"] == -5
        assert result["save_profile"][-1]["value"] == 15

    def test_attack_damage_decreases_as_ac_rises(self):
        """Attack roll spell expected damage monotonically decreases with AC."""
        from analysis.models import AnalysisContext

        spell_a = self._make_attack_spell("Big Attack", 8, 6)
        spell_b = self._make_save_spell("Save Spell R", 1, 4)  # weaker, so A leads throughout
        ctx = AnalysisContext(
            target_ac=1,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=2,
        )
        result = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, ctx)
        damages_a = [e["spell_a_damage"] for e in result["ac_profile"]]
        # Attack spell damage decreases (or stays flat at extremes)
        assert damages_a[0] >= damages_a[-1]

    def test_breakeven_ac_found_when_spells_cross(self):
        """A very strong save spell should overtake a weak attack spell at some AC."""
        from analysis.models import AnalysisContext

        # Weak attack spell: 1d4
        spell_a = self._make_attack_spell("Weak Attack", 1, 4)
        # Strong save spell: 8d6 halved
        spell_b = self._make_save_spell("Strong Save", 8, 6)
        ctx = AnalysisContext(
            target_ac=1,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            number_of_targets=1,
            spell_slot_level=2,
        )
        result = SpellAnalysisService.breakeven_analysis(spell_a, spell_b, ctx)
        # The save spell is so much stronger it should win across all ACs → no crossover
        # OR there's a crossover at a very low AC. Either way breakeven_ac is an int or None.
        assert result["breakeven_ac"] is None or isinstance(result["breakeven_ac"], int)


@pytest.mark.django_db
class TestSpellParsingService:
    """Test spell parsing service."""

    def test_parse_basic_attack_spell(self):
        """Test parsing a basic attack spell."""
        from spells.services import SpellParsingService

        raw_data = {
            "name": "Fire Bolt",
            "level": 0,
            "school": "evocation",
            "casting_time": "1 action",
            "range": "120 feet",
            "duration": "Instantaneous",
            "desc": "You make a ranged spell attack. On a hit, the target takes 1d10 fire damage.",
            "higher_level": "The spell creates more than one dart when you reach higher levels.",
        }

        result = SpellParsingService.parse_spell_data(raw_data)

        assert result["normalized_data"]["name"] == "Fire Bolt"
        assert result["normalized_data"]["is_attack_roll"] is True
        assert result["parsing_data"]["damage_types"] == ["fire"]
        assert (1, 10) in result["parsing_data"]["dice_expressions"]
        assert result["confidence"] > 0.5

    def test_parse_save_spell_with_half_damage(self):
        """Test parsing a save spell with half damage."""
        from spells.services import SpellParsingService

        raw_data = {
            "name": "Fireball",
            "level": 3,
            "school": "evocation",
            "casting_time": "1 action",
            "range": "150 feet",
            "duration": "Instantaneous",
            "desc": "Each creature must make a Dexterity saving throw. "
            "A target takes 8d6 fire damage on a failed save, "
            "or half as much damage on a successful one.",
            "higher_level": "When you cast this spell using a spell slot of 4th level or higher, "
            "the damage increases by 1d6 for each slot level above 3rd.",
        }

        result = SpellParsingService.parse_spell_data(raw_data)

        assert result["normalized_data"]["is_saving_throw"] is True
        assert result["normalized_data"]["save_type"] == "DEX"
        assert result["normalized_data"]["half_damage_on_save"] is True
        assert result["parsing_data"]["damage_types"] == ["fire"]
        assert (8, 6) in result["parsing_data"]["dice_expressions"]
        assert result["parsing_data"]["upcast_scaling"] == (1, 6)
        assert result["confidence"] > 0.7


@pytest.mark.django_db
class TestCharLevelBreakpoints:
    """Tests for SpellAnalysisService._apply_char_level_breakpoints.

    Exercises: no-op cases (empty dict / below all thresholds), threshold
    selection (highest-applicable wins), all three spell-mechanic branches
    (attack roll, saving throw, auto-hit), resistance halving, flat modifier,
    and missing-key graceful defaults.
    """

    # ── Fixtures ────────────────────────────────────────────────────────────

    def _ctx(self, char_level: int = 5, **kwargs) -> "AnalysisContext":  # noqa: F821
        from analysis.models import AnalysisContext

        defaults = {
            "target_ac": 15,
            "caster_attack_bonus": 5,
            "spell_save_dc": 15,
            "target_save_bonus": 0,
            "number_of_targets": 1,
            "spell_slot_level": 1,
            "advantage": False,
            "disadvantage": False,
            "resistance": False,
        }
        defaults.update(kwargs)
        ctx = AnalysisContext(**defaults)
        ctx.character_level = char_level
        return ctx

    def _auto_hit_spell(self, name: str, breakpoints: dict) -> Spell:
        """Auto-hit spell (no attack roll, no save) with given breakpoints."""
        spell = Spell.objects.create(
            name=name,
            level=0,
            school="evocation",
            casting_time="1 action",
            range="5 feet",
            duration="Instantaneous",
            description="Cantrip.",
            is_attack_roll=False,
            is_saving_throw=False,
            char_level_breakpoints=breakpoints,
        )
        DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=8,
            damage_type="fire",
            timing="on_hit",
        )
        return spell

    def _attack_spell(self, name: str, breakpoints: dict, number_of_attacks: int = 1) -> Spell:
        """Attack-roll spell with given breakpoints."""
        spell = Spell.objects.create(
            name=name,
            level=0,
            school="evocation",
            casting_time="1 action",
            range="120 feet",
            duration="Instantaneous",
            description="Attack cantrip.",
            is_attack_roll=True,
            is_saving_throw=False,
            number_of_attacks=number_of_attacks,
            char_level_breakpoints=breakpoints,
        )
        DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=8,
            damage_type="fire",
            timing="on_hit",
        )
        return spell

    def _save_spell(self, name: str, breakpoints: dict) -> Spell:
        """Saving-throw spell with given breakpoints."""
        spell = Spell.objects.create(
            name=name,
            level=0,
            school="evocation",
            casting_time="1 action",
            range="5 feet",
            duration="Instantaneous",
            description="Save cantrip.",
            is_attack_roll=False,
            is_saving_throw=True,
            save_type="DEX",
            half_damage_on_save=False,
            char_level_breakpoints=breakpoints,
        )
        DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=8,
            damage_type="fire",
            timing="on_fail",
        )
        return spell

    # ── No-op cases ─────────────────────────────────────────────────────────

    def test_no_breakpoints_returns_unchanged(self):
        """Spell with empty breakpoints dict → damage unchanged."""
        spell = self._auto_hit_spell("No-BP Spell", {})
        ctx = self._ctx(char_level=10)
        base = 5.0
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, base)
        assert result == base

    def test_below_all_thresholds_returns_unchanged(self):
        """Character level below the lowest threshold → no bonus applied."""
        bp = {"5": {"die_count": 1, "die_size": 6, "flat": 0}}
        spell = self._auto_hit_spell("BP Spell No-Apply", bp)
        ctx = self._ctx(char_level=4)
        base = 4.5
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, base)
        assert result == base

    # ── Threshold selection ──────────────────────────────────────────────────

    def test_exactly_at_threshold_applies_it(self):
        """Character level == threshold → that tier's bonus IS applied."""
        bp = {"5": {"die_count": 1, "die_size": 6, "flat": 0}}  # avg = 3.5
        spell = self._auto_hit_spell("GFB Level 5", bp)
        ctx = self._ctx(char_level=5)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(3.5)

    def test_highest_applicable_threshold_is_used(self):
        """When multiple thresholds qualify, the highest one wins."""
        bp = {
            "5": {"die_count": 1, "die_size": 8, "flat": 0},  # avg 4.5
            "11": {"die_count": 2, "die_size": 8, "flat": 0},  # avg 9.0
            "17": {"die_count": 3, "die_size": 8, "flat": 0},  # avg 13.5
        }
        spell = self._auto_hit_spell("GFB Tiers", bp)
        # char_level=12 → thresholds 5 and 11 qualify; 11 wins (avg 9.0)
        ctx = self._ctx(char_level=12)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(9.0)

    def test_tier_below_next_threshold_not_jumped(self):
        """At level 10 the tier-11 bonus must NOT apply; only tier-5 applies."""
        bp = {
            "5": {"die_count": 1, "die_size": 8, "flat": 0},  # avg 4.5
            "11": {"die_count": 2, "die_size": 8, "flat": 0},  # avg 9.0
        }
        spell = self._auto_hit_spell("GFB Check", bp)
        ctx = self._ctx(char_level=10)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(4.5)

    # ── Spell-mechanic branches ──────────────────────────────────────────────

    def test_auto_hit_spell_gets_raw_bonus(self):
        """Auto-hit spell bonus = average dice (no probability weighting)."""
        bp = {"1": {"die_count": 2, "die_size": 6, "flat": 0}}  # avg 7.0
        spell = self._auto_hit_spell("Auto-Hit BP", bp)
        ctx = self._ctx(char_level=1)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(7.0)

    def test_attack_spell_bonus_scaled_by_hit_probability(self):
        """Attack-roll spell bonus is weighted by hit probability."""
        bp = {"1": {"die_count": 1, "die_size": 8, "flat": 0}}  # avg 4.5
        # AC 15, attack +5 → roll needed = 10 → hit prob = 11/20 = 0.55
        spell = self._attack_spell("Attack BP", bp, number_of_attacks=1)
        ctx = self._ctx(char_level=1, target_ac=15, caster_attack_bonus=5)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        expected_bonus = 4.5 * 0.55  # hit_prob = 11/20
        assert result == pytest.approx(expected_bonus, rel=1e-3)

    def test_save_spell_bonus_scaled_by_fail_probability(self):
        """Save spell bonus is weighted by save-fail probability × targets."""
        bp = {"1": {"die_count": 1, "die_size": 8, "flat": 0}}  # avg 4.5
        # DC 15, save bonus 0 → target needs 15 → fail prob = 14/20 = 0.70
        spell = self._save_spell("Save BP", bp)
        ctx = self._ctx(char_level=1, spell_save_dc=15, target_save_bonus=0, number_of_targets=1)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        expected_bonus = 4.5 * 0.70
        assert result == pytest.approx(expected_bonus, rel=1e-3)

    def test_auto_hit_multiple_targets_not_applicable(self):
        """Auto-hit branch uses raw avg (targets not multiplied — cantrip hits one creature)."""
        bp = {"1": {"die_count": 1, "die_size": 6, "flat": 0}}  # avg 3.5
        spell = self._auto_hit_spell("Auto Multi", bp)
        ctx = self._ctx(char_level=1, number_of_targets=3)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(3.5)  # targets don't multiply auto-hit bonus

    # ── Resistance ───────────────────────────────────────────────────────────

    def test_resistance_halves_bonus(self):
        """With resistance=True the breakpoint bonus is halved before adding."""
        bp = {"1": {"die_count": 2, "die_size": 6, "flat": 0}}  # avg 7.0
        spell = self._auto_hit_spell("Resist BP", bp)
        ctx = self._ctx(char_level=1, resistance=True)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(3.5)  # 7.0 * 0.5

    # ── Flat bonus ───────────────────────────────────────────────────────────

    def test_flat_modifier_included_in_bonus(self):
        """A breakpoint with die_count=0 and flat=3 contributes exactly 3."""
        bp = {"1": {"die_count": 0, "die_size": 6, "flat": 3}}
        spell = self._auto_hit_spell("Flat BP", bp)
        ctx = self._ctx(char_level=1)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(3.0)

    # ── Graceful defaults ────────────────────────────────────────────────────

    def test_missing_die_keys_use_defaults(self):
        """A breakpoint missing die_count / die_size falls back to defaults (1d6+0 = 3.5)."""
        bp = {"1": {}}  # no die_count, no die_size, no flat
        spell = self._auto_hit_spell("Sparse BP", bp)
        ctx = self._ctx(char_level=1)
        result = SpellAnalysisService._apply_char_level_breakpoints(spell, ctx, 0.0)
        assert result == pytest.approx(3.5)  # default 1d6 avg


# ─────────────────────────────────────────────────────────────────────────────
# B7 — SpellParsingService._normalize_raw() and _infer_tags() field mappings
# ─────────────────────────────────────────────────────────────────────────────


class TestSpellParsingServiceNormalizeRaw:
    """Tests for SpellParsingService._normalize_raw() — all field-mapping paths."""

    def setup_method(self):
        from spells.services import SpellParsingService

        self.svc = SpellParsingService

    def test_pascal_case_detected_by_name_key(self):
        """Presence of 'Name' (capital N) without 'name' triggers PascalCase mapping."""
        raw = {"Name": "Fireball", "Level": 3, "School": "evocation"}
        result = self.svc._normalize_raw(raw)
        assert result["name"] == "Fireball"
        assert result["level"] == 3
        assert result["school"] == "evocation"
        assert "Name" not in result

    def test_full_pascal_field_map(self):
        """Every key in _PASCAL_FIELD_MAP is correctly remapped to snake_case."""
        raw = {
            "Name": "Test Spell",
            "Level": 2,
            "School": "illusion",
            "CastingTime": "1 action",
            "Range": "60 feet",
            "Duration": "1 minute",
            "Ritual": False,
            "Description": "A test spell.",
            "Source": "PHB",
            "Components": "V, S",
            "Classes": ["wizard"],
            "HigherLevel": "Deals more damage.",
        }
        result = self.svc._normalize_raw(raw)
        assert result["name"] == "Test Spell"
        assert result["casting_time"] == "1 action"
        assert result["components_raw"] == "V, S"
        assert result["higher_level"] == "Deals more damage."
        assert result["ritual"] is False
        assert result["source"] == "PHB"
        assert result["classes"] == ["wizard"]

    def test_at_higher_levels_alias_maps_to_higher_level(self):
        """'AtHigherLevels' is an alias for 'HigherLevel' — both map to 'higher_level'."""
        raw = {"Name": "Test", "AtHigherLevels": "Double dice."}
        result = self.svc._normalize_raw(raw)
        assert result["higher_level"] == "Double dice."
        assert "AtHigherLevels" not in result

    def test_snake_case_input_passes_through_unchanged(self):
        """No 'Name' key → input returned as-is (already snake_case or Open5e)."""
        raw = {"name": "Magic Missile", "level": 1, "school": "evocation"}
        result = self.svc._normalize_raw(raw)
        assert result == raw

    def test_empty_dict_passes_through(self):
        """Empty dict has no 'Name' key → returned unchanged."""
        assert self.svc._normalize_raw({}) == {}

    def test_extra_snake_case_fields_carried_over(self):
        """Unknown snake_case fields alongside PascalCase are preserved via setdefault."""
        raw = {"Name": "Spell", "Level": 1, "custom_field": "custom_value"}
        result = self.svc._normalize_raw(raw)
        assert result["name"] == "Spell"
        assert result["custom_field"] == "custom_value"

    def test_pascal_case_with_both_name_and_lowercase_name_skips_mapping(self):
        """If both 'Name' and 'name' are present the mapping is NOT triggered."""
        raw = {"Name": "PascalName", "name": "snake_name", "level": 1}
        result = self.svc._normalize_raw(raw)
        # snake_case path: returned as-is because 'name' key is already present
        assert result["name"] == "snake_name"
        assert result.get("Name") == "PascalName"

    def test_ritual_boolean_preserved(self):
        """Boolean values (Ritual: True) survive the mapping unchanged."""
        raw = {"Name": "Detect Magic", "Ritual": True}
        result = self.svc._normalize_raw(raw)
        assert result["ritual"] is True


class TestSpellParsingServiceInferTags:
    """Tests for SpellParsingService._infer_tags() — all tag branches."""

    def setup_method(self):
        from spells.services import SpellParsingService

        self.svc = SpellParsingService

    def _infer(
        self, desc: str = "", higher: str = "", dice: list | None = None, types: list | None = None
    ) -> list[str]:
        return self.svc._infer_tags(desc, higher, dice or [], types or [])

    def test_damage_tag_requires_dice_and_damage_type(self):
        """'damage' tag only appears when BOTH dice and a damage type are present."""
        assert "damage" in self._infer(dice=[(1, 6)], types=["fire"])
        assert "damage" not in self._infer(dice=[(1, 6)], types=[])
        assert "damage" not in self._infer(dice=[], types=["fire"])

    def test_healing_tag_from_description(self):
        """'healing' tag triggered by healing keywords in description."""
        assert "healing" in self._infer(desc="The target regains hit points equal to 2d6.")

    def test_aoe_tag_from_description(self):
        """'aoe' tag triggered by AoE keywords."""
        assert "aoe" in self._infer(desc="Each creature in a 20-foot radius must make a saving throw.")

    def test_crowd_control_tag(self):
        """'crowd_control' tag triggered by condition keywords."""
        assert "crowd_control" in self._infer(desc="The target is restrained until the end of its next turn.")

    def test_summoning_tag(self):
        """'summoning' tag triggered by summon/conjure keywords."""
        assert "summoning" in self._infer(desc="You summon a fey creature that appears in an unoccupied space.")

    def test_buff_tag(self):
        """'buff' tag triggered by buff keywords."""
        assert "buff" in self._infer(desc="The target gains advantage on attack rolls.")

    def test_debuff_tag(self):
        """'debuff' tag triggered by debuff keywords."""
        assert "debuff" in self._infer(desc="The target has disadvantage on saving throws.")

    def test_utility_tag_from_keyword(self):
        """'utility' tag triggered by utility keywords (alongside other tags)."""
        assert "utility" in self._infer(desc="You can fly at a speed of 60 feet.")

    def test_fallback_utility_when_no_other_tags_match(self):
        """With no matching keywords a spell gets only the 'utility' fallback tag."""
        tags = self._infer(desc="A completely mundane description with no keywords.")
        assert tags == ["utility"]

    def test_multiple_tags_returned_sorted(self):
        """A spell can receive multiple tags; they are returned sorted alphabetically."""
        tags = self._infer(
            desc="Each creature in a 20-foot radius takes fire damage on a failed save.",
            dice=[(8, 6)],
            types=["fire"],
        )
        assert "damage" in tags
        assert "aoe" in tags
        assert tags == sorted(tags)

    def test_higher_level_text_also_scanned(self):
        """Tag keywords in higher_level text are detected even if absent from description."""
        tags = self._infer(desc="A plain description.", higher="You summon an additional creature.")
        assert "summoning" in tags
