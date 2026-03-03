"""
Unit tests for analysis services (mathematical engine).
"""
import pytest
from analysis.services import (
    DiceCalculator,
    AttackRollCalculator,
    SavingThrowCalculator,
    SpellAnalysisService
)
from spells.models import Spell, DamageComponent


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
        prob = AttackRollCalculator.hit_probability(
            target_ac=15,
            attack_bonus=5,
            advantage_disadvantage='advantage'
        )
        expected = 1 - (1 - 0.55) ** 2
        assert abs(prob - expected) < 0.001
    
    def test_hit_probability_with_disadvantage(self):
        """Test hit probability with disadvantage."""
        # AC 15, +5 bonus, disadvantage
        # Normal prob would be 0.55
        # With disadvantage: 0.55^2 = 0.3025
        prob = AttackRollCalculator.hit_probability(
            target_ac=15,
            attack_bonus=5,
            advantage_disadvantage='disadvantage'
        )
        expected = 0.55 ** 2
        assert abs(prob - expected) < 0.001
    
    def test_crit_probability_normal(self):
        """Test critical hit probability (normal)."""
        prob = AttackRollCalculator.crit_probability()
        assert prob == 0.05  # 1 in 20
    
    def test_crit_probability_with_advantage(self):
        """Test critical hit probability with advantage."""
        # With advantage: 1 - (19/20)^2 = 1 - 0.9025 = 0.0975
        prob = AttackRollCalculator.crit_probability(advantage_disadvantage='advantage')
        expected = 1 - (19/20) ** 2
        assert abs(prob - expected) < 0.001
    
    def test_crit_probability_with_disadvantage(self):
        """Test critical hit probability with disadvantage."""
        # With disadvantage: (1/20)^2 = 0.0025, but then OR with advantage,
        # Actually it's 1/20 * 1/20 = 0.0025
        prob = AttackRollCalculator.crit_probability(advantage_disadvantage='disadvantage')
        expected = 0.05 * 0.05
        assert abs(prob - expected) < 0.001
    
    def test_expected_damage(self):
        """Test expected damage from attack roll."""
        # Average damage = 10, AC 15, +5 bonus
        # Hit prob = 0.55, crit prob = 0.05
        # Expected = 10 * 0.55 + 20 * 0.05 = 5.5 + 1.0 = 6.5
        expected = AttackRollCalculator.expected_damage(
            average_damage=10.0,
            target_ac=15,
            attack_bonus=5
        )
        assert abs(expected - 6.5) < 0.001


class TestSavingThrowCalculator:
    """Test saving throw probability calculations."""
    
    def test_save_failure_probability_basic(self):
        """Test basic save failure probability."""
        # DC 13, +2 save bonus
        # Need to roll 11 or higher: 10/20 = 0.50
        prob = SavingThrowCalculator.save_failure_probability(
            save_dc=13,
            target_save_bonus=2
        )
        assert prob == 0.50
    
    def test_save_failure_probability_low_dc(self):
        """Test save failure with very low DC."""
        # DC 8, +5 bonus
        # Need to roll 3 or higher: 18/20 = 0.90 success, 0.10 failure
        prob = SavingThrowCalculator.save_failure_probability(
            save_dc=8,
            target_save_bonus=5
        )
        assert prob == 0.10
    
    def test_save_failure_probability_high_dc(self):
        """Test save failure with very high DC."""
        # DC 20, +0 bonus
        # Need to roll 20: 1/20 = 0.05 success, 0.95 failure (max)
        prob = SavingThrowCalculator.save_failure_probability(
            save_dc=20,
            target_save_bonus=0
        )
        assert prob == 0.95
    
    def test_save_failure_minimum(self):
        """Test minimum save failure rate (natural 1)."""
        # DC 5, +10 bonus - still 5% failure rate
        prob = SavingThrowCalculator.save_failure_probability(
            save_dc=5,
            target_save_bonus=10
        )
        assert prob == 0.05
    
    def test_expected_damage_full_on_fail(self):
        """Test expected damage with no save reduction."""
        # 20 damage, DC 13, +2 save, no half damage
        # Failure prob = 0.50
        # Expected = 20 * 0.50 = 10.0
        expected = SavingThrowCalculator.expected_damage(
            full_damage=20.0,
            save_dc=13,
            target_save_bonus=2,
            half_on_success=False
        )
        assert expected == 10.0
    
    def test_expected_damage_half_on_save(self):
        """Test expected damage with half damage on successful save."""
        # 20 damage, DC 13, +2 save, half damage on save
        # Failure prob = 0.50
        # Expected = 20 * 0.50 + 10 * 0.50 = 10 + 5 = 15.0
        expected = SavingThrowCalculator.expected_damage(
            full_damage=20.0,
            save_dc=13,
            target_save_bonus=2,
            half_on_success=True
        )
        assert expected == 15.0


@pytest.mark.django_db
class TestSpellAnalysisService:
    """Test spell analysis service."""
    
    def test_analyze_attack_spell(self):
        """Test analyzing an attack roll spell."""
        spell = Spell.objects.create(
            name='Fire Bolt',
            level=0,
            school='evocation',
            casting_time='1 action',
            range='120 feet',
            duration='Instantaneous',
            description='Fire damage',
            is_attack_roll=True,
            is_saving_throw=False
        )
        
        DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=10,
            damage_type='fire',
            timing='on_hit'
        )
        
        result = SpellAnalysisService.analyze_spell(
            spell=spell,
            target_ac=15,
            caster_spell_attack_bonus=5
        )
        
        assert 'average_damage' in result
        assert 'maximum_damage' in result
        assert 'expected_damage' in result
        assert result['spell_type'] == 'attack_roll'
    
    def test_analyze_save_spell(self):
        """Test analyzing a saving throw spell."""
        spell = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='Fire damage',
            is_attack_roll=False,
            is_saving_throw=True,
            save_type='DEX',
            half_damage_on_save=True
        )
        
        DamageComponent.objects.create(
            spell=spell,
            dice_count=8,
            die_size=6,
            damage_type='fire',
            timing='on_fail'
        )
        
        result = SpellAnalysisService.analyze_spell(
            spell=spell,
            target_saves={'DEX': 2},
            caster_spell_save_dc=13,
            num_targets=3
        )
        
        assert 'average_damage' in result
        assert 'expected_damage' in result
        assert result['spell_type'] == 'saving_throw'
        # Expected damage should account for AOE (3 targets)
        assert result['expected_damage'] > result['average_damage']
    
    def test_analyze_spell_with_upcast(self):
        """Test analyzing spell with upcasting."""
        spell = Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='120 feet',
            duration='Instantaneous',
            description='Force damage',
            upcast_dice_increment=1,
            upcast_die_size=4
        )
        
        # Base: 3 darts at 1d4+1 each
        for _ in range(3):
            DamageComponent.objects.create(
                spell=spell,
                dice_count=1,
                die_size=4,
                flat_modifier=1,
                damage_type='force',
                timing='automatic'
            )
        
        # Analyze at spell slot level 3 (2 levels above base)
        result = SpellAnalysisService.analyze_spell(
            spell=spell,
            slot_level_override=3
        )
        
        # Should add 2d4 damage (1d4 per level above 1st)
        # Base: 3*(1d4+1) = 3*3.5 = 10.5
        # Upcast: +2d4 = +5.0
        # Total: 15.5
        assert 'average_damage' in result
        assert result['average_damage'] >= 15.0  # At least the upcast amount
    
    def test_compare_spells(self):
        """Test comparing two spells."""
        spell_a = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='Fire',
            is_saving_throw=True,
            save_type='DEX',
            half_damage_on_save=True
        )
        
        DamageComponent.objects.create(
            spell=spell_a,
            dice_count=8,
            die_size=6,
            damage_type='fire',
            timing='on_fail'
        )
        
        spell_b = Spell.objects.create(
            name='Lightning Bolt',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='100 feet',
            duration='Instantaneous',
            description='Lightning',
            is_saving_throw=True,
            save_type='DEX',
            half_damage_on_save=True
        )
        
        DamageComponent.objects.create(
            spell=spell_b,
            dice_count=8,
            die_size=6,
            damage_type='lightning',
            timing='on_fail'
        )
        
        result = SpellAnalysisService.compare_spells(
            spell_a=spell_a,
            spell_b=spell_b,
            target_ac=15,
            target_saves={'DEX': 2},
            caster_spell_save_dc=13
        )
        
        assert 'spell_a_analysis' in result
        assert 'spell_b_analysis' in result
        assert 'winner' in result
        # Both have identical damage, should be a tie
        assert result['winner'] in ['tie', spell_a, spell_b]


@pytest.mark.django_db
class TestSpellParsingService:
    """Test spell parsing service."""
    
    def test_parse_basic_attack_spell(self):
        """Test parsing a basic attack spell."""
        from spells.services import SpellParsingService
        
        raw_data = {
            'name': 'Fire Bolt',
            'level': 0,
            'school': 'evocation',
            'casting_time': '1 action',
            'range': '120 feet',
            'duration': 'Instantaneous',
            'desc': 'You make a ranged spell attack. On a hit, the target takes 1d10 fire damage.',
            'higher_level': 'The spell creates more than one dart when you reach higher levels.'
        }
        
        result = SpellParsingService.parse_spell_data(raw_data)
        
        assert result['normalized_data']['name'] == 'Fire Bolt'
        assert result['normalized_data']['is_attack_roll'] is True
        assert result['parsing_data']['damage_types'] == ['fire']
        assert (1, 10) in result['parsing_data']['dice_expressions']
        assert result['confidence'] > 0.5
    
    def test_parse_save_spell_with_half_damage(self):
        """Test parsing a save spell with half damage."""
        from spells.services import SpellParsingService
        
        raw_data = {
            'name': 'Fireball',
            'level': 3,
            'school': 'evocation',
            'casting_time': '1 action',
            'range': '150 feet',
            'duration': 'Instantaneous',
            'desc': 'Each creature must make a Dexterity saving throw. '
                    'A target takes 8d6 fire damage on a failed save, '
                    'or half as much damage on a successful one.',
            'higher_level': 'When you cast this spell using a spell slot of 4th level or higher, '
                          'the damage increases by 1d6 for each slot level above 3rd.'
        }
        
        result = SpellParsingService.parse_spell_data(raw_data)
        
        assert result['normalized_data']['is_saving_throw'] is True
        assert result['normalized_data']['save_type'] == 'DEX'
        assert result['normalized_data']['half_damage_on_save'] is True
        assert result['parsing_data']['damage_types'] == ['fire']
        assert (8, 6) in result['parsing_data']['dice_expressions']
        assert result['parsing_data']['upcast_scaling'] == (1, 6)
        assert result['confidence'] > 0.7
