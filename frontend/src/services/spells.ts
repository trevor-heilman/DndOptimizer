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
  async importSpells(spells: any[]): Promise<{ imported: number; errors: any[] }> {
    const response = await apiClient.post('/spells/spells/import_spells/', { spells });
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
   * Export multiple spells
   */
  async exportSpells(ids: string[]): Promise<any[]> {
    const response = await apiClient.post('/spells/spells/export_multiple/', {
      spell_ids: ids,
    });
    return response.data;
  },
};

export default spellService;
