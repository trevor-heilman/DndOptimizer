/**
 * Spellbooks API service
 */
import apiClient from './api';
import type {
  Spellbook,
  SpellbookCreate,
  SpellbookUpdate,
  SpellbookCopyCost,
  PaginatedResponse,
} from '../types/api';

/**
 * Get list of spellbooks
 */
export async function getSpellbooks(): Promise<Spellbook[]> {
  const response = await apiClient.get<PaginatedResponse<Spellbook>>('/spellbooks/');
  return response.data.results;
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
 * Backend: DELETE /spellbooks/{id}/remove_spell/?spell_id=...
 */
export async function removeSpell(spellbookId: string, spellId: string): Promise<void> {
  await apiClient.delete(
    `/spellbooks/${spellbookId}/remove_spell/`,
    { params: { spell_id: spellId } }
  );
}

/**
 * Update prepared spell status
 * Backend: PATCH /spellbooks/{id}/update_prepared_spell/?spell_id=...
 * Body field is `prepared` (not is_prepared).
 */
export async function updatePreparedSpell(
  spellbookId: string,
  spellId: string,
  prepared: boolean
): Promise<Spellbook> {
  const response = await apiClient.patch<Spellbook>(
    `/spellbooks/${spellbookId}/update_prepared_spell/`,
    { prepared },
    { params: { spell_id: spellId } }
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
export async function exportSpellbook(id: string): Promise<Record<string, unknown>> {
  const response = await apiClient.get(`/spellbooks/${id}/export/`);
  return response.data;
}

/**
 * Reorder spellbooks by updating sort_order in bulk.
 */
export async function reorderSpellbooks(
  items: { id: string; sort_order: number }[]
): Promise<{ updated: number }> {
  const response = await apiClient.post<{ updated: number }>('/spellbooks/reorder/', { items });
  return response.data;
}

/**
 * Get spellbook copy cost (gp + time).
 * Pass an optional characterId to apply that character's discounts.
 */
export async function getCopyCost(id: string, characterId?: string): Promise<SpellbookCopyCost> {
  const params = characterId ? { character_id: characterId } : {};
  const response = await apiClient.get<SpellbookCopyCost>(`/spellbooks/${id}/copy_cost/`, { params });
  return response.data;
}

