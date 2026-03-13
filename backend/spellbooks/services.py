"""
Spellbooks service layer — business logic for spellbook operations.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Character, Spellbook


# Copy cost constants (D&D 5e PHB)
_GOLD_PER_LEVEL = 50   # gp per spell level
_HOURS_PER_LEVEL = 2   # hours per spell level

# Order of Scribes reduces all copy costs by 50%
_SCRIBES_DISCOUNT = 0.50


@dataclass
class SpellCopyEntry:
    name: str
    level: int
    school: str
    gold_cost: float
    time_hours: float
    discount_pct: int  # 0–100


@dataclass
class SpellbookCopyCostResult:
    total_gold: float
    total_hours: float
    spell_entries: list[SpellCopyEntry] = field(default_factory=list)
    scribes_discount_applied: bool = False
    school_discounts_applied: dict[str, int] = field(default_factory=dict)


def calculate_copy_cost(
    spellbook: "Spellbook",
    character: "Character | None" = None,
) -> SpellbookCopyCostResult:
    """
    Calculate the gold and time cost to copy every non-cantrip spell in
    *spellbook* into a new wizard's spellbook.

    Rules (PHB):
      - 50 gp × spell_level per spell
      - 2 hours × spell_level per spell
      - Cantrips cost nothing (wizards don't copy cantrips into spellbooks)

    Wizard subclass discounts:
      - Order of Scribes: 50% off all spells (gold and time)

    Per-school discounts (from character.school_copy_discounts):
      - Applied after the subclass discount.
      - If both apply, the greater discount wins (discounts are not stacked).
    """
    entries: list[SpellCopyEntry] = []

    # Determine base discounts from character
    scribes_discount = False
    school_discounts: dict[str, int] = {}

    if character is not None:
        if character.subclass == 'order_of_scribes':
            scribes_discount = True
        if isinstance(character.school_copy_discounts, dict):
            school_discounts = {
                k: max(0, min(100, int(v)))
                for k, v in character.school_copy_discounts.items()
            }

    for ps in spellbook.prepared_spells.select_related('spell').all():
        spell = ps.spell
        if spell.level == 0:
            # Cantrips are not copied into a wizard's spellbook
            continue

        base_gold = spell.level * _GOLD_PER_LEVEL
        base_hours = spell.level * _HOURS_PER_LEVEL

        # Compute effective discount % (highest wins)
        discount_pct = 0
        if scribes_discount:
            discount_pct = max(discount_pct, 50)
        school_disc = school_discounts.get(spell.school, 0)
        discount_pct = max(discount_pct, school_disc)

        multiplier = 1.0 - discount_pct / 100.0
        gold = round(base_gold * multiplier, 2)
        hours = round(base_hours * multiplier, 2)

        entries.append(SpellCopyEntry(
            name=spell.name,
            level=spell.level,
            school=spell.school,
            gold_cost=gold,
            time_hours=hours,
            discount_pct=discount_pct,
        ))

    total_gold = round(sum(e.gold_cost for e in entries), 2)
    total_hours = round(sum(e.time_hours for e in entries), 2)

    return SpellbookCopyCostResult(
        total_gold=total_gold,
        total_hours=total_hours,
        spell_entries=entries,
        scribes_discount_applied=scribes_discount,
        school_discounts_applied=school_discounts,
    )
