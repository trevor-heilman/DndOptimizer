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

export function useUpdateSpell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Spell> }) =>
      spellService.updateSpell(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      queryClient.invalidateQueries({ queryKey: ['spell', id] });
    },
  });
}

export function useDuplicateSpell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spellService.duplicateSpell(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      queryClient.invalidateQueries({ queryKey: ['spellCounts'] });
    },
  });
}

export function useImportSpells() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spells, isSystem, source }: { spells: unknown[]; isSystem?: boolean; source?: string }) =>
      spellService.importSpells(spells, isSystem, source),
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

export function useSpellSources() {
  return useQuery({
    queryKey: ['spellSources'],
    queryFn: () => spellService.getSpellSources(),
    staleTime: 60_000, // sources change infrequently
  });
}

export function useNeedsReview() {
  return useQuery({
    queryKey: ['spellsNeedsReview'],
    queryFn: () => spellService.getNeedsReview(),
  });
}

export function useMarkReviewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spellService.markReviewed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellsNeedsReview'] });
    },
  });
}
