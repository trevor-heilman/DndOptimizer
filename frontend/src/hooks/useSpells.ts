/**
 * Custom hook for fetching spells
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import spellService from '../services/spells';
import type { Spell, SpellListParams } from '../types/api';

export function useSpells(params?: SpellListParams) {
  return useQuery({
    queryKey: ['spells', params],
    queryFn: () => spellService.getSpells(params),
  });
}

export function useSpell(id: string) {
  return useQuery({
    queryKey: ['spell', id],
    queryFn: () => spellService.getSpell(id),
    enabled: !!id,
  });
}

export function useCreateSpell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Spell>) => spellService.createSpell(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
    },
  });
}

export function useImportSpells() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spells, isSystem }: { spells: any[]; isSystem?: boolean }) =>
      spellService.importSpells(spells, isSystem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      queryClient.invalidateQueries({ queryKey: ['spellCounts'] });
    },
  });
}

export function useDeleteSpell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spellService.deleteSpell(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
    },
  });
}

export function useBulkDeleteSpells() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categories: string[]) => spellService.bulkDeleteSpells(categories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      queryClient.invalidateQueries({ queryKey: ['spellCounts'] });
    },
  });
}

export function useSpellCounts() {
  return useQuery({
    queryKey: ['spellCounts'],
    queryFn: () => spellService.getSpellCounts(),
  });
}
