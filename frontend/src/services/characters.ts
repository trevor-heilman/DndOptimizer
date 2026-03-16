/**
 * Characters API service
 */
import apiClient from './api';
import type {
  Character,
  CharacterCreate,
  CharacterUpdate,
  PreparedSpell,
  PaginatedResponse,
} from '../types/api';

export async function getCharacters(): Promise<Character[]> {
  const response = await apiClient.get<PaginatedResponse<Character>>('/spellbooks/characters/');
  return response.data.results;
}

export async function getCharacter(id: string): Promise<Character> {
  const response = await apiClient.get<Character>(`/spellbooks/characters/${id}/`);
  return response.data;
}

export async function createCharacter(data: CharacterCreate): Promise<Character> {
  const response = await apiClient.post<Character>('/spellbooks/characters/', data);
  return response.data;
}

export async function updateCharacter(id: string, data: CharacterUpdate): Promise<Character> {
  const response = await apiClient.patch<Character>(`/spellbooks/characters/${id}/`, data);
  return response.data;
}

export async function deleteCharacter(id: string): Promise<void> {
  await apiClient.delete(`/spellbooks/characters/${id}/`);
}

export async function updateSpellSlots(id: string, slots: number[]): Promise<Character> {
  const response = await apiClient.patch<Character>(
    `/spellbooks/characters/${id}/spell_slots/`,
    { spell_slots_used: slots },
  );
  return response.data;
}

export async function resetSpellSlots(id: string): Promise<Character> {
  const response = await apiClient.post<Character>(`/spellbooks/characters/${id}/reset_slots/`, {});
  return response.data;
}

export interface CharacterSpell extends PreparedSpell {
  spellbook_name: string;
  spellbook_id: string;
}

export async function getCharacterSpells(id: string): Promise<CharacterSpell[]> {
  const response = await apiClient.get<CharacterSpell[]>(`/spellbooks/characters/${id}/spells/`);
  return response.data;
}

/**
 * Export a character with all linked spellbooks and their spells.
 */
export async function exportCharacter(id: string): Promise<Record<string, unknown>> {
  const response = await apiClient.get(`/spellbooks/characters/${id}/export/`);
  return response.data;
}
