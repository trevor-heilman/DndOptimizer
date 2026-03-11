/**
 * TypeScript types for DndOptimizer API
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
  timing: 'on_hit' | 'on_fail' | 'on_success' | 'end_of_turn' | 'start_of_turn' | 'automatic';
  is_verified: boolean;
}

export interface SpellParsingMetadata {
  id: string;
  parsing_confidence: number;
  requires_review: boolean;
  is_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  parsing_notes?: Record<string, any>;
  auto_extracted_components?: Record<string, any>;
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
  raw_data?: Record<string, any>;
  damage_components?: DamageComponent[];
  parsing_metadata?: SpellParsingMetadata;
  created_by?: string;
  created_at: string;
  updated_at: string;
  source?: string;
  is_custom?: boolean;
  aoe_radius?: number;
  /** Class names that can learn this spell, e.g. ["wizard", "sorcerer"] */
  classes?: string[];
  /** Gameplay tags, e.g. ["damage", "aoe", "ritual"] */
  tags?: string[];
}

export interface SpellListParams {
  page?: number;
  page_size?: number;
  level?: number;
  school?: string;
  search?: string;
  class_name?: string;
  source?: string;
}

// Spellbook types
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
}

export interface SpellbookUpdate {
  name?: string;
  description?: string;
  character_class?: string;
  character_level?: number;
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
  crit_enabled?: boolean;
  half_damage_on_save?: boolean;
  evasion_enabled?: boolean;
}

export interface SpellAnalysisResult {
  spell_name: string;
  spell_type: 'attack_roll' | 'saving_throw' | 'other';
  average_damage: number;
  maximum_damage: number;
  minimum_damage: number;
  expected_damage: number;
  hit_probability?: number;
  save_failure_probability?: number;
}

/** Shape returned by POST /api/analysis/analyze/ */
export interface SpellAnalysisApiResult {
  spell: { id: string; name: string; level: number };
  results: {
    type: 'attack_roll' | 'saving_throw' | 'non_damage';
    expected_damage: number;
    efficiency: number;
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
  [key: string]: any;
}
