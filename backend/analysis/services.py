"""
Spell Analysis Service
Core mathematical engine for D&D 5e spell optimization.
"""
from typing import Any

# Average value subtracted from a target's saving throw by penalty-die effects
# (Mind Sliver / Bane → d4, Synaptic Static → d6).
_PENALTY_DIE_AVG: dict[str, float] = {
    'none': 0.0, 'd4': 2.5, 'd6': 3.5, 'd8': 4.5, 'd10': 5.5, 'd12': 6.5,
}


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
    def hit_probability(
        attack_bonus: int,
        target_ac: int,
        advantage: bool = False,
        disadvantage: bool = False,
        lucky: str = 'none',
    ) -> float:
        """
        Calculate hit probability.
        Base formula: (21 - (AC - attack_bonus)) / 20
        Clamped between 0.05 and 0.95 (natural 1 and 20).

        Lucky Feat: mathematically equivalent to advantage (reroll any miss).
        Halfling Lucky: reroll natural 1s only → P(hit) * 1.05 (capped at 0.95).
        """
        base_roll_needed = target_ac - attack_bonus
        base_prob = max(0.05, min(0.95, (21 - base_roll_needed) / 20))

        if advantage or lucky == 'lucky_feat':
            # P(at least one success) = 1 - P(both fail)
            return min(0.95, 1 - (1 - base_prob) ** 2)
        elif disadvantage:
            # P(both succeed)
            return base_prob ** 2

        if lucky == 'halfling':
            # Reroll natural 1s: natural 1 always misses, reroll gives another shot.
            # P(hit with halfling lucky) = P(hit) + P(nat1) * P(hit on reroll) = P(hit) * 1.05
            return min(0.95, base_prob * 1.05)

        return base_prob

    @staticmethod
    def crit_probability(
        advantage: bool = False,
        disadvantage: bool = False,
        lucky: str = 'none',
    ) -> float:
        """
        Calculate critical hit probability.
        Base: 1/20 = 0.05

        Lucky Feat (reroll misses = advantage) also applies to crits.
        Halfling Lucky only re-rolls natural 1s, not all misses, so crit
        probability is unchanged (the nat-1 reroll contributes ≈0.0025 extra,
        which we treat as negligible).
        """
        base_crit = 0.05

        if advantage or lucky == 'lucky_feat':
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
        crit_type: str = 'double_dice',
        lucky: str = 'none',
        number_of_attacks: int = 1,
        half_on_miss: bool = False,
    ) -> dict[str, float]:
        """
        Calculate expected damage for an attack roll spell.

        crit_type controls how crit damage is computed:
          'double_dice'   – roll the damage dice twice, add modifier once (standard 5e)
          'double_damage' – double the full damage total including modifier
          'max_plus_roll' – maximise first die roll then add a normal roll

        When half_on_miss is True (e.g. Acid Arrow) the spell deals half the
        average base damage on a missed attack in addition to full damage on a hit.
        """
        hit_prob = cls.hit_probability(attack_bonus, target_ac, advantage, disadvantage, lucky)
        crit_prob = cls.crit_probability(advantage, disadvantage, lucky) if crit_enabled else 0

        avg_damage = DiceCalculator.average(dice_count, die_size, modifier)
        max_damage = DiceCalculator.maximum(dice_count, die_size, modifier)

        # Crit damage (expected value) based on table rule
        if crit_type == 'double_damage':
            # Total damage is doubled, including modifier
            crit_damage = avg_damage * 2
        elif crit_type == 'max_plus_roll':
            # First roll maximised; second roll is normal expectation; modifier added once
            crit_damage = DiceCalculator.maximum(dice_count, die_size) + DiceCalculator.average(dice_count, die_size) + modifier
        else:
            # double_dice (standard 5e): dice doubled, modifier added once
            crit_damage = DiceCalculator.average(dice_count * 2, die_size, modifier)

        # Expected damage = P(hit) * avg + P(crit) * extra_crit_damage
        # + P(miss) * avg/2  (only when half_on_miss is True)
        expected = (hit_prob * avg_damage) + (crit_prob * (crit_damage - avg_damage))
        if half_on_miss:
            expected += (1 - hit_prob) * (avg_damage / 2)
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
    def save_failure_probability(
        spell_dc: int,
        save_bonus: int,
        advantage: bool = False,
        disadvantage: bool = False,
        save_penalty_die: str = 'none',
    ) -> float:
        """
        Calculate probability of failing a save.
        Failure formula: (DC - effective_bonus - 1) / 20
        Clamped between 0.05 and 0.95.

        save_penalty_die models effects like Mind Sliver or Bane that force the
        target to subtract a die from their saving throw roll. The average value
        of the die (e.g. 2.5 for d4) is deducted from the effective save bonus.
        """
        effective_bonus = save_bonus - _PENALTY_DIE_AVG.get(save_penalty_die, 0.0)
        roll_needed = spell_dc - effective_bonus
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
        number_of_targets: int = 1,
        save_penalty_die: str = 'none',
    ) -> dict[str, float]:
        """
        Calculate expected damage for a saving throw spell.
        """
        fail_prob = cls.save_failure_probability(spell_dc, save_bonus, advantage, disadvantage, save_penalty_die)
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
        Respects upcast_scale_step: e.g. step=2 means +1 increment every 2 levels
        (like Hex +1d6 per 2 levels).  Default step is 1 (every level).
        """
        if not spell.upcast_dice_increment:
            return 0
        base_level = spell.upcast_base_level if spell.upcast_base_level is not None else spell.level
        levels_above = max(0, slot_level - base_level)
        step = spell.upcast_scale_step or 1
        return (levels_above // step) * spell.upcast_dice_increment

    @staticmethod
    def _upcast_extra_attacks(spell, slot_level: int) -> int:
        """
        Return extra attack rolls gained from upcasting (e.g. Scorching Ray +1 ray/slot).
        Returns 0 if the spell has no upcast_attacks_increment or slot is at/below base level.
        Respects upcast_scale_step (shared with dice scaling).
        """
        if not getattr(spell, 'upcast_attacks_increment', None):
            return 0
        base_level = spell.upcast_base_level if spell.upcast_base_level is not None else spell.level
        levels_above = max(0, slot_level - base_level)
        step = spell.upcast_scale_step or 1
        return (levels_above // step) * spell.upcast_attacks_increment

    @staticmethod
    def analyze_spell(spell, context) -> dict[str, Any]:
        """
        Analyze a spell given a combat context.
        Cantrips scale by character level (via context.character_level).
        Leveled spells apply upcast scaling when context.spell_slot_level exceeds the
        spell's base level (using upcast_dice_increment / upcast_die_size on the spell).
        Returns expected damage and efficiency metrics.
        """
        # --- Cantrip: use character-level tier scaling, not spell slot ---
        if spell.level == 0:
            char_level = getattr(context, 'character_level', 1)
            multiplier = SpellAnalysisService._cantrip_tier_multiplier(char_level)
            components = list(spell.damage_components.all())
            total_avg = sum(
                DiceCalculator.average(c.dice_count * multiplier, c.die_size, c.flat_modifier)
                for c in components
            )
            total_max = sum(
                DiceCalculator.maximum(c.dice_count * multiplier, c.die_size, c.flat_modifier)
                for c in components
            )
            expected = SpellAnalysisService._analyze_cantrip_at_char_level(spell, context, char_level)
            spell_type = (
                'attack_roll' if spell.is_attack_roll
                else 'saving_throw' if spell.is_saving_throw
                else 'non_damage'
            )
            _cantrip_save_penalty = getattr(context, 'save_penalty_die', 'none') or 'none'
            _cantrip_resistance = getattr(context, 'resistance', False)
            _cantrip_ea = getattr(context, 'elemental_adept_type', None) or ''
            _cantrip_bypass_res = bool(_cantrip_ea and any(_cantrip_ea == c.damage_type for c in components))
            if spell.is_attack_roll:
                hit_p = AttackRollCalculator.hit_probability(
                    context.caster_attack_bonus, context.target_ac,
                    context.advantage, context.disadvantage
                )
                crit_p = AttackRollCalculator.crit_probability(context.advantage, context.disadvantage)
                breakdown: dict[str, Any] = {
                    'hit_probability': round(hit_p, 4),
                    'miss_probability': round(1 - hit_p, 4),
                    'crit_probability': round(crit_p, 4),
                    'half_on_miss': False,
                    'number_of_attacks': spell.number_of_attacks,
                    'resistance_applied': _cantrip_resistance and not _cantrip_bypass_res,
                }
            elif spell.is_saving_throw:
                fail_p = SavingThrowCalculator.save_failure_probability(
                    context.spell_save_dc, context.target_save_bonus,
                    context.advantage, context.disadvantage,
                    save_penalty_die=_cantrip_save_penalty,
                )
                breakdown = {
                    'save_failure_probability': round(fail_p, 4),
                    'save_success_probability': round(1 - fail_p, 4),
                    'full_damage_avg': round(total_avg, 2),
                    'half_damage_avg': round(total_avg / 2, 2),
                    'half_on_success': spell.half_damage_on_save,
                    'number_of_targets': context.number_of_targets,
                    'save_penalty_die': _cantrip_save_penalty,
                    'effective_save_bonus': round(context.target_save_bonus - _PENALTY_DIE_AVG.get(_cantrip_save_penalty, 0.0), 2),
                    'resistance_applied': _cantrip_resistance and not _cantrip_bypass_res,
                }
            else:
                breakdown = {}
            return {
                'spell_type': spell_type,
                'average_damage': total_avg,
                'maximum_damage': total_max,
                'expected_damage': expected,
                'upcast_bonus_dice': 0,
                'efficiency': expected,
                'math_breakdown': breakdown,
            }

        # --- Summon spells (TCE-style): derive DPR from creature stat blocks ---
        # This branch fires before `is_attack_roll` so that summon spells — which are
        # flagged is_attack_roll=True for combat-parameter purposes — are handled here
        # rather than falling through to the empty damage_components path.
        _summon_qs = getattr(spell, 'summon_templates', None)
        templates = list(_summon_qs.prefetch_related('attacks').all()) if _summon_qs is not None else []
        if templates:
            slot = context.spell_slot_level
            ctx_crit_type = getattr(context, 'crit_type', 'double_dice') or 'double_dice'
            ctx_lucky = getattr(context, 'lucky', 'none') or 'none'
            ctx_resistance = getattr(context, 'resistance', False)

            per_template_results = []
            for tmpl in templates:
                num_attacks = tmpl.num_attacks_at_level(slot)
                template_expected = 0.0
                template_avg = 0.0
                attack_breakdowns = []

                for atk in tmpl.attacks.all():
                    flat_total = atk.flat_modifier + atk.flat_per_level * slot
                    primary_result = AttackRollCalculator.expected_damage(
                        dice_count=atk.dice_count,
                        die_size=atk.die_size,
                        modifier=flat_total,
                        attack_bonus=context.caster_attack_bonus,
                        target_ac=context.target_ac,
                        advantage=context.advantage,
                        disadvantage=context.disadvantage,
                        crit_enabled=context.crit_enabled,
                        crit_type=ctx_crit_type,
                        lucky=ctx_lucky,
                        number_of_attacks=num_attacks,
                    )
                    # Secondary damage (e.g. Fey spirits +1d6 force) — scales with hit
                    # probability but is not doubled on a critical hit (simplification).
                    secondary_avg = 0.0
                    secondary_expected = 0.0
                    if atk.secondary_dice_count > 0:
                        secondary_avg = DiceCalculator.average(
                            atk.secondary_dice_count, atk.secondary_die_size, atk.secondary_flat
                        )
                        secondary_expected = (
                            secondary_avg * primary_result['hit_probability'] * num_attacks
                        )

                    per_hit_avg = (
                        DiceCalculator.average(atk.dice_count, atk.die_size, flat_total) + secondary_avg
                    )
                    atk_expected = primary_result['expected_damage'] + secondary_expected
                    template_expected += atk_expected
                    template_avg += per_hit_avg * num_attacks
                    attack_breakdowns.append({
                        'name': atk.name,
                        'dice_count': atk.dice_count,
                        'die_size': atk.die_size,
                        'flat_total': flat_total,
                        'secondary_avg': secondary_avg,
                        'per_hit_avg': per_hit_avg,
                        'expected_per_round': atk_expected,
                        'hit_probability': primary_result['hit_probability'],
                        'crit_probability': primary_result['crit_probability'],
                        'num_attacks': num_attacks,
                    })

                if ctx_resistance:
                    template_expected *= 0.5
                    template_avg *= 0.5

                per_template_results.append({
                    'name': tmpl.name,
                    'creature_type': tmpl.creature_type,
                    'hp': tmpl.hp_at_level(slot),
                    'ac': tmpl.ac_at_level(slot),
                    'num_attacks': num_attacks,
                    'expected_dpr': template_expected,
                    'average_dpr': template_avg,
                    'attacks': attack_breakdowns,
                })

            best = max(per_template_results, key=lambda t: t['expected_dpr'])
            # Shared hit probability (all templates use the same attack roll math)
            shared_hit_prob = (
                per_template_results[0]['attacks'][0]['hit_probability']
                if per_template_results and per_template_results[0]['attacks']
                else 0.0
            )
            shared_crit_prob = (
                per_template_results[0]['attacks'][0]['crit_probability']
                if per_template_results and per_template_results[0]['attacks']
                else 0.0
            )
            return {
                'spell_type': 'summon',
                'average_damage': best['average_dpr'],
                'maximum_damage': best['average_dpr'],
                'expected_damage': best['expected_dpr'],
                'upcast_bonus_dice': 0,
                'efficiency': best['expected_dpr'] / slot if slot > 0 else 0,
                'math_breakdown': {
                    'slot_level': slot,
                    'hit_probability': round(shared_hit_prob, 4),
                    'miss_probability': round(1 - shared_hit_prob, 4),
                    'crit_probability': round(shared_crit_prob, 4),
                    'best_template': best['name'],
                    'num_attacks': best['num_attacks'],
                    'resistance_applied': ctx_resistance,
                    'per_template': per_template_results,
                },
            }

        components = list(spell.damage_components.all())

        # Per-component upcast scaling (e.g. Acid Arrow: each component gains +1d4/slot separately).
        # Compute levels_above once so each branch can use _effective_dice consistently.
        upcast_base = spell.upcast_base_level if spell.upcast_base_level is not None else spell.level
        levels_above = max(0, context.spell_slot_level - upcast_base)

        def _effective_dice(c) -> int:
            """Dice count for component c at the current slot, accounting for per-component upcast."""
            if not c.upcast_dice_increment:
                return c.dice_count
            step = c.upcast_scale_step or spell.upcast_scale_step or 1
            return c.dice_count + (c.upcast_dice_increment * (levels_above // step))

        # spellcasting_ability_modifier is typically set on the analysis context; default to 3
        # for backward compatibility with contexts created before the field existed.
        spell_mod = getattr(context, 'spellcasting_ability_modifier', 3)

        def _eff_mod(c) -> int:
            """Effective flat modifier, adding spellcasting ability modifier when flagged."""
            bonus = spell_mod if getattr(c, 'uses_spellcasting_modifier', False) else 0
            return c.flat_modifier + bonus

        total_average = sum(
            DiceCalculator.average(_effective_dice(c), c.die_size, _eff_mod(c)) for c in components
        )
        total_maximum = sum(
            DiceCalculator.maximum(_effective_dice(c), c.die_size, _eff_mod(c)) for c in components
        )

        # Spell-level upcast bonus dice: only applicable when no component handles its own scaling.
        # Components with upcast_dice_increment take precedence over spell-level dice scaling.
        any_component_upcast = any(c.upcast_dice_increment is not None for c in components)
        extra_dice = (
            0 if any_component_upcast
            else SpellAnalysisService._upcast_extra_dice(spell, context.spell_slot_level)
        )
        upcast_die_size = spell.upcast_die_size or 6  # fallback to d6 if not set
        # Upcast bonus attacks (e.g. Scorching Ray: +1 ray per slot above base)
        extra_attacks = SpellAnalysisService._upcast_extra_attacks(spell, context.spell_slot_level)
        total_attacks = spell.number_of_attacks + extra_attacks

        # Advanced context modifiers (new fields are backward-compatible via getattr)
        ctx_crit_type = getattr(context, 'crit_type', 'double_dice') or 'double_dice'
        ctx_lucky = getattr(context, 'lucky', 'none') or 'none'
        ctx_elemental_adept = getattr(context, 'elemental_adept_type', None) or ''
        ctx_save_penalty = getattr(context, 'save_penalty_die', 'none') or 'none'
        # Resistance is bypassed if every component's damage type is covered by Elemental Adept.
        spell_damage_types = {c.damage_type for c in components}
        bypass_resistance = bool(
            ctx_elemental_adept and ctx_elemental_adept in spell_damage_types
        )

        if spell.is_attack_roll:
            total_expected = 0
            math_hit_prob: float | None = None
            math_crit_prob: float | None = None
            for component in components:
                # end_of_turn / delayed components trigger automatically after the
                # attack hits, but they are NOT doubled on a critical hit and do NOT
                # deal half damage on a miss.
                no_crit = component.timing in ('end_of_turn', 'per_round', 'delayed')
                half_on_miss = getattr(spell, 'half_damage_on_miss', False) and not no_crit
                result = AttackRollCalculator.expected_damage(
                    dice_count=_effective_dice(component),
                    die_size=component.die_size,
                    modifier=_eff_mod(component),
                    attack_bonus=context.caster_attack_bonus,
                    target_ac=context.target_ac,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    crit_enabled=context.crit_enabled and not no_crit,
                    crit_type=ctx_crit_type,
                    lucky=ctx_lucky,
                    number_of_attacks=total_attacks,
                    half_on_miss=half_on_miss,
                )
                total_expected += result['expected_damage']
                if math_hit_prob is None:
                    math_hit_prob = result['hit_probability']
                    math_crit_prob = result['crit_probability']

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
                    crit_type=ctx_crit_type,
                    lucky=ctx_lucky,
                    number_of_attacks=total_attacks,
                )
                total_expected += upcast_result['expected_damage']
                total_average += DiceCalculator.average(extra_dice, upcast_die_size)
                total_maximum += DiceCalculator.maximum(extra_dice, upcast_die_size)
                if math_hit_prob is None:
                    math_hit_prob = upcast_result['hit_probability']
                    math_crit_prob = upcast_result['crit_probability']

            hit_prob_final = math_hit_prob if math_hit_prob is not None else 0.0
            crit_prob_final = math_crit_prob if math_crit_prob is not None else 0.0
            if getattr(context, 'resistance', False) and not bypass_resistance:
                total_expected *= 0.5
            return {
                'spell_type': 'attack_roll',
                'average_damage': total_average,
                'maximum_damage': total_maximum,
                'expected_damage': total_expected,
                'upcast_bonus_dice': extra_dice,
                'efficiency': total_expected / context.spell_slot_level if context.spell_slot_level > 0 else 0,
                'math_breakdown': {
                    'hit_probability': round(hit_prob_final, 4),
                    'miss_probability': round(1 - hit_prob_final, 4),
                    'crit_probability': round(crit_prob_final, 4),
                    'half_on_miss': getattr(spell, 'half_damage_on_miss', False),
                    'number_of_attacks': total_attacks,
                    'resistance_applied': getattr(context, 'resistance', False) and not bypass_resistance,
                },
            }

        elif spell.is_saving_throw:
            total_expected = 0
            math_fail_prob: float | None = None
            for component in components:
                result = SavingThrowCalculator.expected_damage(
                    dice_count=_effective_dice(component),
                    die_size=component.die_size,
                    modifier=_eff_mod(component),
                    spell_dc=context.spell_save_dc,
                    save_bonus=context.target_save_bonus,
                    half_on_success=spell.half_damage_on_save,
                    advantage=context.advantage,
                    disadvantage=context.disadvantage,
                    evasion=context.evasion_enabled,
                    number_of_targets=context.number_of_targets,
                    save_penalty_die=ctx_save_penalty,
                )
                total_expected += result['expected_total_damage']
                if math_fail_prob is None:
                    math_fail_prob = result['save_failure_probability']

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
                    number_of_targets=context.number_of_targets,
                    save_penalty_die=ctx_save_penalty,
                )
                total_expected += upcast_result['expected_total_damage']
                total_average += DiceCalculator.average(extra_dice, upcast_die_size)
                total_maximum += DiceCalculator.maximum(extra_dice, upcast_die_size)
                if math_fail_prob is None:
                    math_fail_prob = upcast_result['save_failure_probability']

            fail_prob_final = math_fail_prob if math_fail_prob is not None else 0.0
            if getattr(context, 'resistance', False) and not bypass_resistance:
                total_expected *= 0.5
            return {
                'spell_type': 'saving_throw',
                'average_damage': total_average,
                'maximum_damage': total_maximum,
                'expected_damage': total_expected,
                'upcast_bonus_dice': extra_dice,
                'efficiency': total_expected / context.spell_slot_level if context.spell_slot_level > 0 else 0,
                'math_breakdown': {
                    'save_failure_probability': round(fail_prob_final, 4),
                    'save_success_probability': round(1 - fail_prob_final, 4),
                    'full_damage_avg': round(total_average, 2),
                    'half_damage_avg': round(total_average / 2, 2),
                    'half_on_success': spell.half_damage_on_save,
                    'number_of_targets': context.number_of_targets,
                    'save_penalty_die': ctx_save_penalty,
                    'effective_save_bonus': round(context.target_save_bonus - _PENALTY_DIE_AVG.get(ctx_save_penalty, 0.0), 2),
                    'resistance_applied': getattr(context, 'resistance', False) and not bypass_resistance,
                },
            }

        elif spell.is_auto_hit:
            # Guaranteed-hit spells (e.g. Magic Missile): expected damage = avg_per_dart * total_attacks
            total_expected = 0.0
            for component in components:
                avg = DiceCalculator.average(_effective_dice(component), component.die_size, _eff_mod(component))
                total_expected += avg * total_attacks

            if extra_dice > 0:
                extra_avg = DiceCalculator.average(extra_dice, upcast_die_size) * total_attacks
                total_expected += extra_avg
                total_average += DiceCalculator.average(extra_dice, upcast_die_size)
                total_maximum += DiceCalculator.maximum(extra_dice, upcast_die_size)

            if getattr(context, 'resistance', False) and not bypass_resistance:
                total_expected *= 0.5
            return {
                'spell_type': 'auto_hit',
                'average_damage': total_average * total_attacks,
                'maximum_damage': total_maximum * total_attacks,
                'expected_damage': total_expected,
                'upcast_bonus_dice': extra_dice,
                'efficiency': total_expected / context.spell_slot_level if context.spell_slot_level > 0 else 0,
                'math_breakdown': {},
            }

        return {
            'spell_type': 'non_damage',
            'average_damage': total_average,
            'maximum_damage': total_maximum,
            'expected_damage': 0,
            'upcast_bonus_dice': extra_dice,
            'efficiency': 0,
            'math_breakdown': {},
        }

    @staticmethod
    def compare_spells(spell_a, spell_b, context_a, context_b=None) -> dict[str, Any]:
        """
        Compare two spells. context_a and context_b may differ in number_of_targets
        and resistance to model per-spell differences (e.g. AoE vs single-target).
        If context_b is omitted, context_a is used for both spells.
        """
        if context_b is None:
            context_b = context_a
        result_a = SpellAnalysisService.analyze_spell(spell_a, context_a)
        result_b = SpellAnalysisService.analyze_spell(spell_b, context_b)

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
        All advanced modifiers (crit_type, lucky, elemental_adept_type, save_penalty_die)
        are propagated from base so efficiency/growth analysis inherits them.
        """
        from analysis.models import AnalysisContext
        return AnalysisContext(
            target_ac=overrides.get('target_ac', base.target_ac),
            target_save_bonus=overrides.get('target_save_bonus', base.target_save_bonus),
            spell_save_dc=base.spell_save_dc,
            caster_attack_bonus=base.caster_attack_bonus,
            number_of_targets=overrides.get('number_of_targets', base.number_of_targets),
            advantage=base.advantage,
            disadvantage=base.disadvantage,
            spell_slot_level=overrides.get('spell_slot_level', base.spell_slot_level),
            crit_enabled=base.crit_enabled,
            half_damage_on_save=base.half_damage_on_save,
            evasion_enabled=base.evasion_enabled,
            resistance=overrides.get('resistance', getattr(base, 'resistance', False)),
            crit_type=getattr(base, 'crit_type', 'double_dice'),
            lucky=getattr(base, 'lucky', 'none'),
            elemental_adept_type=getattr(base, 'elemental_adept_type', None),
            save_penalty_die=getattr(base, 'save_penalty_die', 'none'),
        )

    # Standard full-caster: character level → highest available spell slot
    _CHAR_LEVEL_TO_SLOT: dict[int, int] = {
        1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5,
        11: 6, 12: 6, 13: 7, 14: 7, 15: 8, 16: 8, 17: 9, 18: 9, 19: 9, 20: 9,
    }

    @staticmethod
    def _cantrip_tier_multiplier(character_level: int) -> int:
        """Return the standard 5e cantrip die-count multiplier for a given character level."""
        if character_level >= 17:
            return 4
        if character_level >= 11:
            return 3
        if character_level >= 5:
            return 2
        return 1

    @classmethod
    def _analyze_cantrip_at_char_level(cls, spell, base_context, character_level: int) -> float:
        """Compute expected damage for a cantrip using the 5e tier-multiplier model."""
        multiplier = cls._cantrip_tier_multiplier(character_level)
        components = list(spell.damage_components.all())

        ctx_crit_type = getattr(base_context, 'crit_type', 'double_dice') or 'double_dice'
        ctx_lucky = getattr(base_context, 'lucky', 'none') or 'none'
        ctx_elemental_adept = getattr(base_context, 'elemental_adept_type', None) or ''
        spell_damage_types = {c.damage_type for c in components}
        bypass_resistance = bool(ctx_elemental_adept and ctx_elemental_adept in spell_damage_types)

        if spell.is_attack_roll:
            total = 0.0
            for c in components:
                r = AttackRollCalculator.expected_damage(
                    dice_count=c.dice_count * multiplier,
                    die_size=c.die_size,
                    modifier=c.flat_modifier,
                    attack_bonus=base_context.caster_attack_bonus,
                    target_ac=base_context.target_ac,
                    advantage=base_context.advantage,
                    disadvantage=base_context.disadvantage,
                    crit_enabled=base_context.crit_enabled,
                    crit_type=ctx_crit_type,
                    lucky=ctx_lucky,
                    number_of_attacks=spell.number_of_attacks,
                )
                total += r['expected_damage']
            if getattr(base_context, 'resistance', False) and not bypass_resistance:
                total *= 0.5
            return total
        elif spell.is_saving_throw:
            ctx_save_penalty = getattr(base_context, 'save_penalty_die', 'none') or 'none'
            total = 0.0
            for c in components:
                r = SavingThrowCalculator.expected_damage(
                    dice_count=c.dice_count * multiplier,
                    die_size=c.die_size,
                    modifier=c.flat_modifier,
                    spell_dc=base_context.spell_save_dc,
                    save_bonus=base_context.target_save_bonus,
                    half_on_success=spell.half_damage_on_save,
                    advantage=base_context.advantage,
                    disadvantage=base_context.disadvantage,
                    evasion=base_context.evasion_enabled,
                    number_of_targets=base_context.number_of_targets,
                    save_penalty_die=ctx_save_penalty,
                )
                total += r['expected_total_damage']
            if getattr(base_context, 'resistance', False) and not bypass_resistance:
                total *= 0.5
            return total
        elif spell.is_auto_hit:
            total = 0.0
            for c in components:
                avg = DiceCalculator.average(c.dice_count * multiplier, c.die_size, c.flat_modifier)
                total += avg * spell.number_of_attacks
            if getattr(base_context, 'resistance', False) and not bypass_resistance:
                total *= 0.5
            return total
        return 0.0

    @classmethod
    def _analyze_spell_at_slot(cls, spell, base_context, slot_level: int) -> float:
        """Analyze a leveled spell at a specific slot level, returning expected damage."""
        ctx = cls._clone_context(base_context, spell_slot_level=slot_level)
        return cls.analyze_spell(spell, ctx)['expected_damage']

    @classmethod
    def compare_growth_analysis(cls, spell_a, spell_b, base_context) -> dict[str, Any]:
        """
        Compute damage growth profiles for both spells across character levels 1-20.

        For cantrips: uses standard 5e tier multiplier at each character level.
        For leveled spells: uses the highest available spell slot at each character level,
        so at character level 7 a level-3 spell is cast with a 4th-level slot (upcast).

        Also produces a slot-level sweep for leveled-vs-leveled comparisons.
        """
        is_a_cantrip = spell_a.level == 0
        is_b_cantrip = spell_b.level == 0

        profile = []
        for char_level in range(1, 21):
            best_slot = cls._CHAR_LEVEL_TO_SLOT[char_level]

            # Spell A
            if is_a_cantrip:
                a_dmg = cls._analyze_cantrip_at_char_level(spell_a, base_context, char_level)
                a_slot = None
            else:
                if best_slot >= spell_a.level:
                    a_slot = best_slot  # upcast to max available
                    a_dmg = cls._analyze_spell_at_slot(spell_a, base_context, a_slot)
                else:
                    a_slot = None
                    a_dmg = 0.0

            # Spell B
            if is_b_cantrip:
                b_dmg = cls._analyze_cantrip_at_char_level(spell_b, base_context, char_level)
                b_slot = None
            else:
                if best_slot >= spell_b.level:
                    b_slot = best_slot
                    b_dmg = cls._analyze_spell_at_slot(spell_b, base_context, b_slot)
                else:
                    b_slot = None
                    b_dmg = 0.0

            profile.append({
                'x': char_level,
                'label': f'Lvl {char_level}',
                'spell_a_damage': round(a_dmg, 4),
                'spell_b_damage': round(b_dmg, 4),
                'spell_a_slot': a_slot,
                'spell_b_slot': b_slot,
            })

        # Crossover: first character level where A first exceeds B
        crossover_x = None
        for i in range(1, len(profile)):
            prev, curr = profile[i - 1], profile[i]
            if prev['spell_a_damage'] <= prev['spell_b_damage'] and curr['spell_a_damage'] > curr['spell_b_damage']:
                crossover_x = curr['x']
                break

        # Slot-level sweep (only meaningful when both are leveled spells)
        slot_profile: list = []
        slot_crossover = None
        if not is_a_cantrip and not is_b_cantrip:
            min_slot = min(spell_a.level, spell_b.level)
            for slot in range(min_slot, 10):
                a_sd = cls._analyze_spell_at_slot(spell_a, base_context, slot) if slot >= spell_a.level else 0.0
                b_sd = cls._analyze_spell_at_slot(spell_b, base_context, slot) if slot >= spell_b.level else 0.0
                slot_profile.append({
                    'slot': slot,
                    'label': f'Slot {slot}',
                    'spell_a_damage': round(a_sd, 4),
                    'spell_b_damage': round(b_sd, 4),
                })
            for i in range(1, len(slot_profile)):
                prev, curr = slot_profile[i - 1], slot_profile[i]
                if prev['spell_a_damage'] <= prev['spell_b_damage'] and curr['spell_a_damage'] > curr['spell_b_damage']:
                    slot_crossover = curr['slot']
                    break

        return {
            'profile': profile,
            'crossover_x': crossover_x,
            'slot_profile': slot_profile,
            'slot_crossover': slot_crossover,
        }

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
            profile.append({'value': val, 'spell_a_damage': round(a, 4), 'spell_b_damage': round(b, 4)})
            if prev_diff is not None and breakeven is None and prev_diff * diff < 0:
                breakeven = prev_val  # last integer point before the lead changed
            prev_diff = diff
            prev_val = val
        return profile, breakeven

    @staticmethod
    def breakeven_analysis(spell_a, spell_b, base_context) -> dict[str, Any]:
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
