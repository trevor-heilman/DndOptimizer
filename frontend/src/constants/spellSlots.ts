/**
 * D&D 5e spell slot tables, shared across pages.
 */

// Full caster (Bard, Cleric, Druid, Sorcerer, Wizard)
export const FULL_CASTER_SLOTS: Record<number, number[]> = {
   1: [2,0,0,0,0,0,0,0,0],  2: [3,0,0,0,0,0,0,0,0],
   3: [4,2,0,0,0,0,0,0,0],  4: [4,3,0,0,0,0,0,0,0],
   5: [4,3,2,0,0,0,0,0,0],  6: [4,3,3,0,0,0,0,0,0],
   7: [4,3,3,1,0,0,0,0,0],  8: [4,3,3,2,0,0,0,0,0],
   9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1],
};

// Half caster (Paladin, Ranger, Artificer)
export const HALF_CASTER_SLOTS: Record<number, number[]> = {
   1: [0,0,0,0,0,0,0,0,0],  2: [2,0,0,0,0,0,0,0,0],
   3: [3,0,0,0,0,0,0,0,0],  4: [3,0,0,0,0,0,0,0,0],
   5: [4,2,0,0,0,0,0,0,0],  6: [4,2,0,0,0,0,0,0,0],
   7: [4,3,0,0,0,0,0,0,0],  8: [4,3,0,0,0,0,0,0,0],
   9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0],
  19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0],
};

// Warlock (Pact Magic) — all slots are the same level
export const WARLOCK_SLOTS: Record<number, { slots: number; slotLevel: number }> = {
   1: { slots: 1, slotLevel: 1 },  2: { slots: 2, slotLevel: 1 },
   3: { slots: 2, slotLevel: 2 },  4: { slots: 2, slotLevel: 2 },
   5: { slots: 2, slotLevel: 3 },  6: { slots: 2, slotLevel: 3 },
   7: { slots: 2, slotLevel: 4 },  8: { slots: 2, slotLevel: 4 },
   9: { slots: 2, slotLevel: 5 }, 10: { slots: 2, slotLevel: 5 },
  11: { slots: 3, slotLevel: 5 }, 12: { slots: 3, slotLevel: 5 },
  13: { slots: 3, slotLevel: 5 }, 14: { slots: 3, slotLevel: 5 },
  15: { slots: 3, slotLevel: 5 }, 16: { slots: 3, slotLevel: 5 },
  17: { slots: 4, slotLevel: 5 }, 18: { slots: 4, slotLevel: 5 },
  19: { slots: 4, slotLevel: 5 }, 20: { slots: 4, slotLevel: 5 },
};

export const HALF_CASTER_CLASSES = new Set(['paladin', 'ranger', 'artificer']);

/**
 * Returns a 9-element array of max slots per spell level for the given
 * class and level, or null if the class has no spellcasting / unknown.
 */
export function getSpellSlots(characterClass: string, level: number): number[] | null {
  if (!level || !characterClass) return null;
  if (characterClass === 'warlock') {
    const wl = WARLOCK_SLOTS[level];
    if (!wl) return null;
    const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    arr[wl.slotLevel - 1] = wl.slots;
    return arr;
  }
  const table = HALF_CASTER_CLASSES.has(characterClass) ? HALF_CASTER_SLOTS : FULL_CASTER_SLOTS;
  return table[level] ?? null;
}
