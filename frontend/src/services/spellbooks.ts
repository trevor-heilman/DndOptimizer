/**
 * Spellbooks API service
 */
import apiClient from './api';
import type {
  Spellbook,
  SpellbookCreate,
  SpellbookUpdate,
} from '../types/api';

/**
 * Get list of spellbooks
 */
export async function getSpellbooks(): Promise<Spellbook[]> {
  const response = await apiClient.get<Spellbook[]>('/spellbooks/');
  return response.data;
}

/**
 * Get single spellbook by ID
 */
export async function getSpellbook(id: string): Promise<Spellbook> {
  const response = await apiClient.get<Spellbook>(`/spellbooks/${id}/`);
  return response.data;
}

/**
 * Create a new spellbook
 */
export async function createSpellbook(data: SpellbookCreate): Promise<Spellbook> {
  const response = await apiClient.post<Spellbook>('/spellbooks/', data);
  return response.data;
}

/**
 * Update an existing spellbook
 */
export async function updateSpellbook(id: string, data: SpellbookUpdate): Promise<Spellbook> {
  const response = await apiClient.patch<Spellbook>(`/spellbooks/${id}/`, data);
  return response.data;
}

/**
 * Delete a spellbook
 */
export async function deleteSpellbook(id: string): Promise<void> {
  await apiClient.delete(`/spellbooks/${id}/`);
}

/**
 * Add spell to spellbook
 */
export async function addSpell(spellbookId: string, spellId: string): Promise<Spellbook> {
  const response = await apiClient.post<Spellbook>(
    `/spellbooks/${spellbookId}/add_spell/`,
    { spell_id: spellId }
  );
  return response.data;
}

/**
 * Remove spell from spellbook
 */
export async function removeSpell(spellbookId: string, spellId: string): Promise<Spellbook> {
  const response = await apiClient.post<Spellbook>(
    `/spellbooks/${spellbookId}/remove_spell/`,
    { spell_id: spellId }
  );
  return response.data;
}

/**
 * Update prepared spell
 */
export async function updatePreparedSpell(
  spellbookId: string,
  spellId: string,
  isPrepared: boolean
): Promise<Spellbook> {
  const response = await apiClient.post<Spellbook>(
    `/spellbooks/${spellbookId}/update_prepared_spell/`,
    { spell_id: spellId, is_prepared: isPrepared }
  );
  return response.data;
}

/**
 * Duplicate spellbook
 */
export async function duplicateSpellbook(id: string): Promise<Spellbook> {
  const response = await apiClient.post<Spellbook>(`/spellbooks/${id}/duplicate/`, {});
  return response.data;
}

/**
 * Export spellbook
 */
export async function exportSpellbook(id: string): Promise<any> {
  const response = await apiClient.get(`/spellbooks/${id}/export/`);
  return response.data;
}

