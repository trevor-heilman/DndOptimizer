"""
Spell Analysis Service
Core mathematical engine for D&D 5e spell optimization.
"""
from typing import Dict, Any


class DiceCalculator:
    """
    Utility for dice probability calculations.
    """
    
    @staticmethod
    def average(dice_count: int, die_size: int, modifier: int = 0) -> float:
        """
        Calculate average damage for NdX + modifier.
        Formula: N * (X + 1) / 2 + modifier
        """
        return (dice_count * (die_size + 1) / 2) + modifier
    
    @staticmethod
    def maximum(dice_count: int, die_size: int, modifier: int = 0) -> int:
        """Calculate maximum damage."""
        return (dice_count * die_size) + modifier
    
    @staticmethod
    def minimum(dice_count: int, die_size: int, modifier: int = 0) -> int:
        """Calculate minimum damage."""
        return dice_count + modifier


class AttackRollCalculator:
    """
    Calculates expected damage for attack roll spells.
    """
    
    @staticmethod
    def hit_probability(attack_bonus: int, target_ac: int, advantage: bool = False, disadvantage: bool = False) -> float:
        """
        Calculate hit probability.
        Base formula: (21 - (AC - attack_bonus)) / 20
        Clamped between 0.05 and 0.95 (natural 1 and 20).
        """
        base_roll_needed = target_ac - attack_bonus
        base_prob = max(0.05, min(0.95, (21 - base_roll_needed) / 20))
        
        if advantage:
            # P(at least one success) = 1 - P(both fail)
            return 1 - (1 - base_prob) ** 2
        elif disadvantage:
            # P(at least one success) = P(both succeed)
            return base_prob ** 2
        
        return base_prob
    
    @staticmethod
    def crit_probability(advantage: bool = False, disadvantage: bool = False) -> float:
        """
        Calculate critical hit probability.
        Base: 1/20 = 0.05
        """
        base_crit = 0.05
        
        if advantage:
            return 1 - (1 - base_crit) ** 2
        elif disadvantage:
            return base_crit ** 2
        
        return base_crit
    
    @classmethod
    def expected_damage(
        cls,
        dice_count: int,
        die_size: int,
        modifier: int,
        attack_bonus: int,
        target_ac: int,
        advantage: bool = False,
        disadvantage: bool = False,
        crit_enabled: bool = True,
        number_of_attacks: int = 1
    ) -> Dict[str, float]:
        """
        Calculate expected damage for an attack roll spell.
        """
        hit_prob = cls.hit_probability(attack_bonus, target_ac, advantage, disadvantage)
        crit_prob = cls.crit_probability(advantage, disadvantage) if crit_enabled else 0
        
        avg_damage = DiceCalculator.average(dice_count, die_size, modifier)
        max_damage = DiceCalculator.maximum(dice_count, die_size, modifier)
        
        # On crit, double the dice (not the modifier)
        crit_damage = DiceCalculator.average(dice_count * 2, die_size, modifier)
        
        # Expected damage = P(hit) * avg + P(crit) * extra_crit_damage
        expected = (hit_prob * avg_damage) + (crit_prob * (crit_damage - avg_damage))
        expected *= number_of_attacks
        
        return {
            'hit_probability': hit_prob,
            'crit_probability': crit_prob,
            'average_damage': avg_damage,
            'max_damage': max_damage,
            'expected_damage': expected,
            'number_of_attacks': number_of_attacks,
        }


class SavingThrowCalculator:
    """
    Calculates expected damage for saving throw spells.
    """
    
    @staticmethod
    def save_failure_probability(spell_dc: int, save_bonus: int, advantage: bool = False, disadvantage: bool = False) -> float:
        """
        Calculate probability of failing a save.
        Failure formula: (DC - save_bonus - 1) / 20
        Clamped between 0.05 and 0.95.
        """
        roll_needed = spell_dc - save_bonus
        base_prob = max(0.05, min(0.95, (roll_needed - 1) / 20))
        
        if advantage:
            # Advantage on saves means harder to fail
            return base_prob ** 2
        elif disadvantage:
            # Disadvantage on saves means easier to fail
            return 1 - (1 - base_prob) ** 2
        
        return base_prob
    
    @classmethod
    def expected_damage(
        cls,
        dice_count: int,
        die_size: int,
        modifier: int,
        spell_dc: int,
        save_bonus: int,
        half_on_success: bool = True,
        advantage: bool = False,
        disadvantage: bool = False,
        evasion: bool = False,
        number_of_targets: int = 1
    ) -> Dict[str, float]:
        """
        Calculate expected damage for a saving throw spell.
        """
        fail_prob = cls.save_failure_probability(spell_dc, save_bonus, advantage, disadvantage)
        success_prob = 1 - fail_prob
        
        full_damage = DiceCalculator.average(dice_count, die_size, modifier)
        max_damage = DiceCalculator.maximum(dice_count, die_size, modifier)
        
        # Evasion: no damage on success
        if evasion:
            half_on_success = False
        
        success_damage = (full_damage / 2) if half_on_success else 0
        
        # Expected damage = P(fail) * full + P(success) * partial
        expected_single = (fail_prob * full_damage) + (success_prob * success_damage)
        expected_total = expected_single * number_of_targets
        
        return {
            'save_failure_probability': fail_prob,
            'full_damage': full_damage,
            'max_damage': max_damage,
            'expected_damage_per_target': expected_single,
            'expected_total_damage': expected_total,
            'number_of_targets': number_of_targets,
        }


class SpellAnalysisService:
    """
    High-level service for spell analysis.
    """

    @staticmethod
    def _upcast_extra_dice(spell, slot_level: int) -> int:
        """
        Return total bonus dice gained from casting at slot_level.
        Returns 0 if the spell has no upcast data or slot is at/below base level.
        """
        if not spell.upcast_dice_increment:
            return 0
        base_level = spell.upcast_base_level if spell.upcast_base_level is not None else spell.level
        levels_above = max(0, slot_level - base_level)
        return levels_above * spell.upcast_dice_increment

    @staticmethod
    def analyze_spell(spell, context) -> Dict[str, Any]:
        """
        Analyze a spell given a combat context.
        Applies upcast scaling when context.spell_slot_level exceeds the spell's
        base level (using upcast_dice_increment / upcast_die_size on the spell).
        Returns expected damage and efficiency metrics.
        """
        components = list(spell.damage_components.all())
        total_average = sum(
            DiceCalculator.average(c.dice_count, c.die_size, c.flat_modifier) for c in components
        )
        total_maximum = sum(
            DiceCalculator.maximum(c.dice_count, c.die_size, c.flat_modifier) for c in components
        )

        # Upcast bonus dice (0 when not applicable)
        extra_dice = SpellAnalysisService._upcast_extra_dice(spell, context.spell_slot_level)
        upcast_die_size = spell.upcast_die_size or 6  # fallback to d6 if not set

        if spell.is_attack_roll:
            total_expected = 0
            for component in components:
                result = AttackRollCalculator.expected_damage(
                    dice_count=component.dice_count,
                    die_size=component.die_size,
                    modifier=component.flat_modifier,
                    attack_bonus=context.caster_attack_bonus,
                    target_ac=context.target_ac,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    crit_enabled=context.crit_enabled,
                    number_of_attacks=spell.number_of_attacks
                )
                total_expected += result['expected_damage']

            # Add upcast dice — they also benefit from hit/crit probability
            if extra_dice > 0:
                upcast_result = AttackRollCalculator.expected_damage(
                    dice_count=extra_dice,
                    die_size=upcast_die_size,
                    modifier=0,
                    attack_bonus=context.caster_attack_bonus,
                    target_ac=context.target_ac,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    crit_enabled=context.crit_enabled,
                    number_of_attacks=spell.number_of_attacks
                )
                total_expected += upcast_result['expected_damage']
                total_average += DiceCalculator.average(extra_dice, upcast_die_size)
                total_maximum += DiceCalculator.maximum(extra_dice, upcast_die_size)

            return {
                'spell_type': 'attack_roll',
                'average_damage': total_average,
                'maximum_damage': total_maximum,
                'expected_damage': total_expected,
                'upcast_bonus_dice': extra_dice,
                'efficiency': total_expected / context.spell_slot_level if context.spell_slot_level > 0 else 0,
            }

        elif spell.is_saving_throw:
            total_expected = 0
            for component in components:
                result = SavingThrowCalculator.expected_damage(
                    dice_count=component.dice_count,
                    die_size=component.die_size,
                    modifier=component.flat_modifier,
                    spell_dc=context.spell_save_dc,
                    save_bonus=context.target_save_bonus,
                    half_on_success=spell.half_damage_on_save,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    evasion=context.evasion_enabled,
                    number_of_targets=context.number_of_targets
                )
                total_expected += result['expected_total_damage']

            # Add upcast dice — they also go through the save probability
            if extra_dice > 0:
                upcast_result = SavingThrowCalculator.expected_damage(
                    dice_count=extra_dice,
                    die_size=upcast_die_size,
                    modifier=0,
                    spell_dc=context.spell_save_dc,
                    save_bonus=context.target_save_bonus,
                    half_on_success=spell.half_damage_on_save,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    evasion=context.evasion_enabled,
                    number_of_targets=context.number_of_targets
                )
                total_expected += upcast_result['expected_total_damage']
                total_average += DiceCalculator.average(extra_dice, upcast_die_size)
                total_maximum += DiceCalculator.maximum(extra_dice, upcast_die_size)

            return {
                'spell_type': 'saving_throw',
                'average_damage': total_average,
                'maximum_damage': total_maximum,
                'expected_damage': total_expected,
                'upcast_bonus_dice': extra_dice,
                'efficiency': total_expected / context.spell_slot_level if context.spell_slot_level > 0 else 0,
            }

        return {
            'spell_type': 'non_damage',
            'average_damage': total_average,
            'maximum_damage': total_maximum,
            'expected_damage': 0,
            'upcast_bonus_dice': extra_dice,
            'efficiency': 0,
        }
    
    @staticmethod
    def compare_spells(spell_a, spell_b, context) -> Dict[str, Any]:
        """
        Compare two spells in a given context.
        """
        result_a = SpellAnalysisService.analyze_spell(spell_a, context)
        result_b = SpellAnalysisService.analyze_spell(spell_b, context)
        
        return {
            'spell_a': {
                'name': spell_a.name,
                'level': spell_a.level,
                'expected_damage': result_a['expected_damage'],
                'efficiency': result_a['efficiency'],
            },
            'spell_b': {
                'name': spell_b.name,
                'level': spell_b.level,
                'expected_damage': result_b['expected_damage'],
                'efficiency': result_b['efficiency'],
            },
            'winner': 'spell_a' if result_a['expected_damage'] > result_b['expected_damage'] else 'spell_b',
            'damage_difference': abs(result_a['expected_damage'] - result_b['expected_damage']),
        }

    @staticmethod
    def _clone_context(base, **overrides):
        """
        Create a transient (unsaved) AnalysisContext from base, applying field overrides.
        """
        from analysis.models import AnalysisContext
        return AnalysisContext(
            target_ac=overrides.get('target_ac', base.target_ac),
            target_save_bonus=overrides.get('target_save_bonus', base.target_save_bonus),
            spell_save_dc=base.spell_save_dc,
            caster_attack_bonus=base.caster_attack_bonus,
            number_of_targets=base.number_of_targets,
            advantage=base.advantage,
            disadvantage=base.disadvantage,
            spell_slot_level=base.spell_slot_level,
            crit_enabled=base.crit_enabled,
            half_damage_on_save=base.half_damage_on_save,
            evasion_enabled=base.evasion_enabled,
        )

    @staticmethod
    def _sweep_param(spell_a, spell_b, base_context, param: str, values) -> tuple:
        """
        Sweep a single context parameter across the given values. Returns (profile, breakeven)
        where breakeven is the last value before spell_a and spell_b swap lead, or None.
        """
        profile = []
        breakeven = None
        prev_diff = None
        prev_val = None
        for val in values:
            ctx = SpellAnalysisService._clone_context(base_context, **{param: val})
            a = SpellAnalysisService.analyze_spell(spell_a, ctx)['expected_damage']
            b = SpellAnalysisService.analyze_spell(spell_b, ctx)['expected_damage']
            diff = a - b
            profile.append({param: val, 'spell_a_damage': round(a, 4), 'spell_b_damage': round(b, 4)})
            if prev_diff is not None and breakeven is None and prev_diff * diff < 0:
                breakeven = prev_val  # last integer point before the lead changed
            prev_diff = diff
            prev_val = val
        return profile, breakeven

    @staticmethod
    def breakeven_analysis(spell_a, spell_b, base_context) -> Dict[str, Any]:
        """
        Find the target_ac and target_save_bonus crossover points where spell_a and
        spell_b deal equal expected damage. Returns full sweep profiles for charting.

        Sweeps:
          - target_ac: 1 to 30
          - target_save_bonus: -5 to +15
        """
        ac_profile, breakeven_ac = SpellAnalysisService._sweep_param(
            spell_a, spell_b, base_context, 'target_ac', range(1, 31)
        )
        save_profile, breakeven_save_bonus = SpellAnalysisService._sweep_param(
            spell_a, spell_b, base_context, 'target_save_bonus', range(-5, 16)
        )
        return {
            'breakeven_ac': breakeven_ac,
            'breakeven_save_bonus': breakeven_save_bonus,
            'ac_profile': ac_profile,
            'save_profile': save_profile,
        }
