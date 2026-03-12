/**
 * Spells API service
 */
import apiClient from './api';
import type {
  Spell,
  SpellListParams,
  PaginatedResponse,
} from '../types/api';

export const spellService = {
  /**
   * Get list of spells with pagination and filtering
   */
  async getSpells(params?: SpellListParams): Promise<PaginatedResponse<Spell>> {
    const response = await apiClient.get<PaginatedResponse<Spell>>('/spells/spells/', {
      params,
    });
    return response.data;
  },

  /**
   * Get single spell by ID
   */
  async getSpell(id: string): Promise<Spell> {
    const response = await apiClient.get<Spell>(`/spells/spells/${id}/`);
    return response.data;
  },

  /**
   * Create a new spell
   */
  async createSpell(data: Partial<Spell>): Promise<Spell> {
    const response = await apiClient.post<Spell>('/spells/spells/', data);
    return response.data;
  },

  /**
   * Update an existing spell
   */
  async updateSpell(id: string, data: Partial<Spell>): Promise<Spell> {
    const response = await apiClient.put<Spell>(`/spells/spells/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a spell
   */
  async deleteSpell(id: string): Promise<void> {
    await apiClient.delete(`/spells/spells/${id}/`);
  },

  /**
   * Import spells from JSON
   */
  async importSpells(
    spells: any[],
    isSystem = false,
    source = '',
  ): Promise<{ imported: number; errors: any[] }> {
    const response = await apiClient.post('/spells/spells/import_spells/', {
      spells,
      is_system: isSystem,
      source,
    });
    return response.data;
  },

  /**
   * Return distinct non-empty source values visible to the current user
   */
  async getSpellSources(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/spells/spells/sources/');
    return response.data;
  },

  /**
   * Bulk delete spells by category
   */
  async bulkDeleteSpells(categories: string[]): Promise<{ deleted: number }> {
    const response = await apiClient.post<{ deleted: number }>('/spells/spells/bulk_delete/', { categories });
    return response.data;
  },

  /**
   * Get spell counts per delete category for the current user
   */
  async getSpellCounts(): Promise<{ system: number; imported: number; custom: number }> {
    const response = await apiClient.get<{ system: number; imported: number; custom: number }>('/spells/spells/spell_counts/');
    return response.data;
  },

  /**
   * Export single spell
   */
  async exportSpell(id: string): Promise<any> {
    const response = await apiClient.get(`/spells/spells/${id}/export/`);
    return response.data;
  },

  /**
   * Duplicate a spell — returns the new custom copy owned by the current user
   */
  async duplicateSpell(id: string): Promise<Spell> {
    const response = await apiClient.post<Spell>(`/spells/spells/${id}/duplicate/`);
    return response.data;
  },

  /**
   * Export multiple spells
   */
  async exportSpells(ids: string[]): Promise<any[]> {
    const response = await apiClient.post('/spells/spells/export_multiple/', {
      spell_ids: ids,
    });
    return response.data;
  },

  /** Admin: list spells that require a confidence review. */
  async getNeedsReview(): Promise<Spell[]> {
    const response = await apiClient.get<Spell[]>('/spells/spells/needs_review/');
    return response.data;
  },

  /** Admin: mark a spell's parsing as reviewed. */
  async markReviewed(id: string): Promise<Spell> {
    const response = await apiClient.post<Spell>(`/spells/spells/${id}/mark_reviewed/`);
    return response.data;
  },
};

export default spellService;
