/**
 * React Query hooks for characters
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as characterService from '../services/characters';
import type { CharacterCreate, CharacterUpdate } from '../types/api';

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: characterService.getCharacters,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCharacter(id: string, enabled = true) {
  return useQuery({
    queryKey: ['character', id],
    queryFn: () => characterService.getCharacter(id),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CharacterCreate) => characterService.createCharacter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useUpdateCharacter(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CharacterUpdate) => characterService.updateCharacter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', id] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => characterService.deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}

export function useUpdateSpellSlots(characterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: number[]) => characterService.updateSpellSlots(characterId, slots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', characterId] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useResetSpellSlots(characterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => characterService.resetSpellSlots(characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', characterId] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useCharacterSpells(id: string, enabled = true) {
  return useQuery({
    queryKey: ['character-spells', id],
    queryFn: () => characterService.getCharacterSpells(id),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
