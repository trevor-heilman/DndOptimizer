export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;

export type SpellSchool = typeof SPELL_SCHOOLS[number];

/**
 * Centralized spell color maps.
 *
 * Inline `style` props are used throughout (not Tailwind class names) so that
 * Vite/Tailwind never purges them at build time.
 */

export interface SchoolColors {
  border: string;
  bg: string;
  text: string;
}

export interface DamageColors {
  bg: string;
  text: string;
}

export const SCHOOL_COLORS: Record<string, SchoolColors> = {
  abjuration:    { border: '#3b82f6', bg: '#1e3a5f33', text: '#93c5fd' },
  conjuration:   { border: '#14b8a6', bg: '#1a3a3833', text: '#5eead4' },
  divination:    { border: '#f59e0b', bg: '#3d2a0a33', text: '#fcd34d' },
  enchantment:   { border: '#ec4899', bg: '#3d1a2e33', text: '#f9a8d4' },
  evocation:     { border: '#ef4444', bg: '#3d151533', text: '#fca5a5' },
  illusion:      { border: '#8b5cf6', bg: '#2e1a5f33', text: '#c4b5fd' },
  necromancy:    { border: '#22c55e', bg: '#1a3a2033', text: '#86efac' },
  transmutation: { border: '#f97316', bg: '#3d201033', text: '#fdba74' },
};

export const DEFAULT_SCHOOL_COLORS: SchoolColors = {
  border: '#5e5e6c',
  bg: '#1c1c2e33',
  text: '#b9b9c2',
};

export const DAMAGE_COLORS: Record<string, DamageColors> = {
  fire:         { bg: '#450a0a', text: '#fca5a5' },
  cold:         { bg: '#082f49', text: '#7dd3fc' },
  lightning:    { bg: '#422006', text: '#fde68a' },
  thunder:      { bg: '#1c1c2e', text: '#c4b5fd' },
  poison:       { bg: '#14200a', text: '#bbf7d0' },
  acid:         { bg: '#1a2e0a', text: '#d9f99d' },
  necrotic:     { bg: '#0a2010', text: '#86efac' },
  radiant:      { bg: '#422005', text: '#fef08a' },
  force:        { bg: '#2e0e4a', text: '#e9d5ff' },
  psychic:      { bg: '#3a0a3a', text: '#f5d0fe' },
  bludgeoning:  { bg: '#1c1c24', text: '#d1d5db' },
  piercing:     { bg: '#1c1c24', text: '#d1d5db' },
  slashing:     { bg: '#1c1c24', text: '#d1d5db' },
};

export const DEFAULT_DAMAGE_COLORS: DamageColors = { bg: '#1c1c24', text: '#d1d5db' };

export const DAMAGE_TYPES = Object.keys({
  fire: 1, cold: 1, lightning: 1, thunder: 1, poison: 1,
  acid: 1, necrotic: 1, radiant: 1, force: 1, psychic: 1,
  bludgeoning: 1, piercing: 1, slashing: 1,
}) as string[];

export const DND_CLASSES = [
  'artificer', 'barbarian', 'bard', 'cleric', 'druid',
  'fighter', 'monk', 'paladin', 'ranger', 'rogue',
  'sorcerer', 'warlock', 'wizard',
] as const;

export type DndClass = typeof DND_CLASSES[number];

export const SPELL_TAGS = [
  'damage', 'aoe', 'utility', 'crowd_control', 'healing',
  'summoning', 'buff', 'debuff',
] as const;

/** Look up school colors, falling back to the default neutral palette. */
export function getSchoolColors(school: string): SchoolColors {
  return SCHOOL_COLORS[school.toLowerCase()] ?? DEFAULT_SCHOOL_COLORS;
}

/** Look up damage-type colors, falling back to the default neutral palette. */
export function getDamageColors(damageType: string): DamageColors {
  return DAMAGE_COLORS[damageType.toLowerCase()] ?? DEFAULT_DAMAGE_COLORS;
}
