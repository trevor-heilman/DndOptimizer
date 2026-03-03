/**
 * TypeScript types for DndOptimizer API
 */

// User types
export interface User {
  id: string;
  email: string;
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
  description: string;
  higher_level?: string;
  upcast_dice_increment?: number;
  upcast_die_size?: number;
  raw_data?: Record<string, any>;
  damage_components?: DamageComponent[];
  parsing_metadata?: SpellParsingMetadata;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SpellListParams {
  page?: number;
  page_size?: number;
  level?: number;
  school?: string;
  search?: string;
}

// Spellbook types
export interface PreparedSpell {
  id: string;
  spell: Spell;
  is_prepared: boolean;
  notes?: string;
}

export interface Spellbook {
  id: string;
  owner: string;
  name: string;
  description?: string;
  spells: Spell[];
  prepared_spells?: PreparedSpell[];
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
}

export interface SpellbookUpdate {
  name?: string;
  description?: string;
}

// Analysis types
export interface AnalysisContext {
  target_ac?: number;
  target_saves?: Record<string, number>;
  caster_spell_attack_bonus?: number;
  caster_spell_save_dc?: number;
  advantage_disadvantage?: 'normal' | 'advantage' | 'disadvantage';
  num_targets?: number;
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

export interface CompareSpellsRequest extends AnalysisContext {
  spell_a_id: string;
  spell_b_id: string;
}

export interface CompareSpellsResponse {
  spell_a: SpellAnalysisResult;
  spell_b: SpellAnalysisResult;
  winner: 'spell_a' | 'spell_b' | 'tie';
  difference: number;
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
