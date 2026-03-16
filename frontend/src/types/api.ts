/**
 * TypeScript types for Spellwright API
 */

// User types
export interface User {
  id: string;
  email: string;
  is_staff?: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Spell types
export interface DamageComponent {
  id: string;
  dice_count: number;
  die_size: number;
  flat_modifier?: number;
  damage_type: string;
  timing: 'on_hit' | 'on_fail' | 'on_success' | 'end_of_turn' | 'per_round' | 'delayed';
  condition_label?: string | null;
  on_crit_extra: boolean;
  scales_with_slot: boolean;
  upcast_dice_increment?: number | null;
  upcast_scale_step?: number | null;
  uses_spellcasting_modifier?: boolean;
  is_verified: boolean;
}

export interface SummonAttack {
  id: string;
  name: string;
  attack_type: 'melee_weapon' | 'ranged_weapon' | 'melee_spell' | 'ranged_spell';
  dice_count: number;
  die_size: number;
  flat_modifier: number;
  flat_per_level: number;
  damage_type: string;
  secondary_dice_count: number;
  secondary_die_size: number;
  secondary_flat: number;
  secondary_damage_type: string;
}

export interface SummonTemplate {
  id: string;
  name: string;
  creature_type: string;
  source: string;
  base_hp: number;
  hp_per_level: number;
  hp_base_level: number;
  base_ac: number;
  ac_per_level: number;
  num_attacks_formula: 'floor_half_level';
  attacks: SummonAttack[];
}

export interface SpellParsingMetadata {
  id: string;
  parsing_confidence: number;
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  parsing_notes?: Record<string, unknown>;
  auto_extracted_components?: Record<string, unknown>;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  is_attack_roll: boolean;
  is_saving_throw: boolean;
  is_auto_hit: boolean;
  save_type?: string;
  half_damage_on_save: boolean;
  components_v?: boolean;
  components_s?: boolean;
  components_m?: boolean;
  material?: string;
  description: string;
  higher_level?: string;
  upcast_base_level?: number;
  upcast_dice_increment?: number;
  upcast_die_size?: number;
  upcast_attacks_increment?: number;
  upcast_scale_step?: number;
  raw_data?: Record<string, unknown>;
  damage_components?: DamageComponent[];
  summon_templates?: SummonTemplate[];
  parsing_metadata?: SpellParsingMetadata;
  created_by?: string;
  created_at: string;
  updated_at: string;
  source?: string;
  is_custom?: boolean;
  aoe_radius?: number;
  number_of_attacks?: number;
  /** Class names that can learn this spell, e.g. ["wizard", "sorcerer"] */
  classes?: string[];
  /** Gameplay tags, e.g. ["damage", "aoe", "ritual"] */
  tags?: string[];
  /**
   * Character-level scaling breakpoints. Keys are string thresholds (e.g. "5"),
   * values are { die_count, die_size, flat? }. The highest applicable tier is used.
   */
  char_level_breakpoints?: Record<string, { die_count: number; die_size: number; flat?: number }>;
}

export interface SpellListParams {
  page?: number;
  page_size?: number;
  /** Single level or multiple levels (OR logic) */
  level?: number | number[];
  /** Single school or multiple schools (OR logic) */
  school?: string | string[];
  search?: string;
  /** Single class or multiple classes (OR logic) */
  class_name?: string | string[];
  /** Single source or multiple sources (OR logic) */
  source?: string | string[];
  concentration?: boolean;
  is_attack_roll?: boolean;
  is_saving_throw?: boolean;
  /** Single damage type or multiple (OR logic) */
  damage_type?: string | string[];
  /** Single tag or multiple tags (OR logic) */
  tag?: string | string[];
  has_v?: boolean;
  has_s?: boolean;
  has_m?: boolean;
  ordering?: string;
  not_in_spellbook?: string;
}

// ─── Character types ─────────────────────────────────────────────────────────

export type BookColor =
  | 'violet' | 'crimson' | 'emerald' | 'sapphire' | 'amber'
  | 'teal'   | 'indigo'  | 'gold'    | 'ruby'     | 'forest'
  | 'slate'  | 'rose'    | 'copper'  | 'midnight' | 'ivory' | 'obsidian' | 'white';

export interface Character {
  id: string;
  owner: string;
  owner_username: string;
  name: string;
  character_class: string;
  character_level: number;
  subclass: string;
  portrait_color: BookColor;
  ruleset: '2014' | '2024';
  spellcasting_ability_modifier: number;
  dc_bonus: number;
  attack_bonus_extra: number;
  spell_slots_used: number[];     // 9 elements
  school_copy_discounts: Record<string, number>;
  prepared_spells_bonus: number;
  // computed
  spell_save_dc: number;
  spell_attack_bonus: number;
  proficiency_bonus: number;
  max_prepared_spells: number | null;
  spellbook_count: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterCreate {
  name: string;
  character_class?: string;
  character_level?: number;
  subclass?: string;
  portrait_color?: BookColor;
  ruleset?: '2014' | '2024';
  spellcasting_ability_modifier?: number;
  dc_bonus?: number;
  attack_bonus_extra?: number;
  spell_slots_used?: number[];
  school_copy_discounts?: Record<string, number>;
  prepared_spells_bonus?: number;
}

export type CharacterUpdate = Partial<CharacterCreate>;

export interface SpellbookCopyCostEntry {
  name: string;
  level: number;
  school: string;
  gold_cost: number;
  time_hours: number;
  discount_pct: number;
}

export interface SpellbookCopyCost {
  total_gold: number;
  total_hours: number;
  scribes_discount_applied: boolean;
  school_discounts_applied: Record<string, number>;
  spell_entries: SpellbookCopyCostEntry[];
}

// ─── Spellbook types ─────────────────────────────────────────────────────────

export interface PreparedSpell {
  id: string;
  spell: Spell;
  /** Field name from API is `prepared` (not is_prepared) */
  prepared: boolean;
  notes?: string;
  added_at: string;
  updated_at: string;
}

export interface Spellbook {
  id: string;
  owner: string;
  name: string;
  description?: string;
  character_class?: string;
  character_level?: number;
  character?: string | null;       // Character UUID
  character_name?: string | null;
  book_color?: BookColor;
  /** Optional override for the spine text color (empty string = use palette default). */
  label_color?: string;
  sort_order: number;
  /**
   * Only present on detail endpoint (SpellbookDetailSerializer).
   * Use prepared_spells[n].spell to access spell data.
   */
  prepared_spells?: PreparedSpell[];
  spell_count: number;
  prepared_spell_count: number;
  created_at: string;
  updated_at: string;
}

export interface AddSpellToSpellbookRequest {
  spell_id: string;
  is_prepared?: boolean;
  notes?: string;
}

export interface SpellbookCreate {
  name: string;
  description?: string;
  character_class?: string;
  character_level?: number;
  character?: string | null;
  book_color?: BookColor;
  label_color?: string;
}

export interface SpellbookUpdate {
  name?: string;
  description?: string;
  character_class?: string;
  character_level?: number;
  character?: string | null;
  book_color?: BookColor;
  label_color?: string;
  sort_order?: number;
}

// Analysis types
export interface AnalysisContext {
  target_ac?: number;
  target_save_bonus?: number;
  spell_save_dc?: number;
  caster_attack_bonus?: number;
  number_of_targets?: number;
  advantage?: boolean;
  disadvantage?: boolean;
  spell_slot_level?: number;
  character_level?: number;
  crit_enabled?: boolean;
  half_damage_on_save?: boolean;
  evasion_enabled?: boolean;
  resistance?: boolean;
  crit_type?: 'double_dice' | 'double_damage' | 'max_plus_roll';
  lucky?: 'none' | 'halfling' | 'lucky_feat';
  elemental_adept_type?: string | null;
  /** Die subtracted from target saving throws (Mind Sliver, Bane → d4; Synaptic Static → d6). */
  save_penalty_die?: 'none' | 'd4' | 'd6' | 'd8';
  /** Caster's spellcasting ability modifier (added to damage components with uses_spellcasting_modifier). */
  spellcasting_ability_modifier?: number;
}

export interface SpellAnalysisResult {
  spell_name: string;
  spell_type: 'attack_roll' | 'saving_throw' | 'summon' | 'other';
  average_damage: number;
  maximum_damage: number;
  minimum_damage: number;
  expected_damage: number;
  hit_probability?: number;
  save_failure_probability?: number;
}

/** Shape returned by POST /api/analysis/analyze/ */
export interface SummonPerTemplateResult {
  name: string;
  creature_type: string;
  hp: number;
  ac: number;
  num_attacks: number;
  expected_dpr: number;
  average_dpr: number;
  attacks: Array<{
    name: string;
    per_hit_avg: number;
    hit_probability: number;
    crit_probability: number;
    expected_per_round: number;
    num_attacks: number;
  }>;
}

export interface MathBreakdown {
  // attack roll fields
  hit_probability?: number;
  miss_probability?: number;
  crit_probability?: number;
  half_on_miss?: boolean;
  number_of_attacks?: number;
  // saving throw fields
  save_failure_probability?: number;
  save_success_probability?: number;
  full_damage_avg?: number;
  half_damage_avg?: number;
  half_on_success?: boolean;
  number_of_targets?: number;
  save_penalty_die?: string;
  effective_save_bonus?: number;
  // summon fields
  slot_level?: number;
  best_template?: string;
  num_attacks?: number;
  per_template?: SummonPerTemplateResult[];
  // shared
  resistance_applied?: boolean;
}

export interface SpellAnalysisApiResult {
  spell: { id: string; name: string; level: number };
  results: {
    spell_type: 'attack_roll' | 'saving_throw' | 'auto_hit' | 'summon' | 'non_damage';
    average_damage: number;
    maximum_damage: number;
    expected_damage: number;
    efficiency: number;
    upcast_bonus_dice: number;
    math_breakdown: MathBreakdown;
  };
}

/** Single row in efficiency_by_slot array */
export interface EfficiencyDataPoint {
  slot_level: number;
  expected_damage: number;
  efficiency: number;
}

/** Shape returned by POST /api/analysis/efficiency/ */
export interface SpellEfficiencyResponse {
  spell: { id: string; name: string; level: number };
  efficiency_by_slot: EfficiencyDataPoint[];
}

export interface CompareSpellsRequest extends AnalysisContext {
  spell_a_id: string;
  spell_b_id: string;
  /** Per-spell overrides — if provided, override the shared context for that spell only */
  number_of_targets_a?: number;
  number_of_targets_b?: number;
  resistance_a?: boolean;
  resistance_b?: boolean;
}

/** One spell's entry inside the compare results */
export interface SpellComparisonResult {
  name: string;
  level: number;
  expected_damage: number;
  efficiency: number;
}

/** Shape of response.data.results from POST /api/analysis/compare/ */
export interface CompareSpellsResponse {
  spell_a: SpellComparisonResult;
  spell_b: SpellComparisonResult;
  winner: 'spell_a' | 'spell_b';
  damage_difference: number;
}

/** One data point in a breakeven sweep profile */
export interface BreakevenProfilePoint {
  value: number;
  spell_a_damage: number;
  spell_b_damage: number;
}

export interface BreakevenRequest extends AnalysisContext {
  spell_a_id: string;
  spell_b_id: string;
}

export interface BreakevenResponse {
  spell_a: { id: string; name: string; level: number };
  spell_b: { id: string; name: string; level: number };
  breakeven_ac: number | null;
  breakeven_save_bonus: number | null;
  ac_profile: BreakevenProfilePoint[];
  save_profile: BreakevenProfilePoint[];
}

// ── Spell Growth / Compare Growth ────────────────────────────────────────────

export interface CompareGrowthRequest {
  spell_a_id: string;
  spell_b_id: string;
  target_ac?: number;
  target_save_bonus?: number;
  spell_save_dc?: number;
  caster_attack_bonus?: number;
  number_of_targets?: number;
  advantage?: boolean;
  disadvantage?: boolean;
  crit_enabled?: boolean;
  half_damage_on_save?: boolean;
  evasion_enabled?: boolean;
}

export interface GrowthProfilePoint {
  /** Character level (1-20) for cantrip profiles; spell slot level (1-9) for spell profiles. */
  x: number;
  label: string;
  spell_a_damage: number;
  spell_b_damage: number;
  /** Highest available slot at this character level for the spell (null if cantrip). */
  spell_a_slot: number | null;
  spell_b_slot: number | null;
}

export interface SlotProfilePoint {
  slot: number;
  label: string;
  spell_a_damage: number;
  spell_b_damage: number;
}

export interface CompareGrowthResponse {
  spell_a: { id: string; name: string; level: number };
  spell_b: { id: string; name: string; level: number };
  /** Character-level sweep (1-20). Cantrips scale by tier; spells cast at highest available slot. */
  profile: GrowthProfilePoint[];
  /** Character level at which the weaker spell first surpasses the other, or null. */
  crossover_x: number | null;
  /** Slot-level sweep (only present when both spells are leveled). */
  slot_profile: SlotProfilePoint[];
  /** Slot level at which the weaker spell first surpasses the other, or null. */
  slot_crossover: number | null;
}

// Pagination
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Error
export interface APIError {
  detail?: string;
  [key: string]: unknown;
}
