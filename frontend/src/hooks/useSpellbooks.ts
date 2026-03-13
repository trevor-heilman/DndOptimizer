/**
 * React Query hooks for spellbooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as spellbookService from '../services/spellbooks';
import type { SpellbookCreate, SpellbookUpdate } from '../types/api';

export function useSpellbooks() {
  return useQuery({
    queryKey: ['spellbooks'],
    queryFn: spellbookService.getSpellbooks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSpellbook(id: string, enabled = true) {
  return useQuery({
    queryKey: ['spellbook', id],
    queryFn: () => spellbookService.getSpellbook(id),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useSpellbookCopyCost(id: string, characterId?: string, enabled = true) {
  return useQuery({
    queryKey: ['spellbook-copy-cost', id, characterId ?? null],
    queryFn: () => spellbookService.getCopyCost(id, characterId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateSpellbook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SpellbookCreate) => spellbookService.createSpellbook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}

export function useUpdateSpellbook(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SpellbookUpdate) => spellbookService.updateSpellbook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbook', id] });
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}

export function useDeleteSpellbook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => spellbookService.deleteSpellbook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}

export function useAddSpellToSpellbook(spellbookId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (spellId: string) => spellbookService.addSpell(spellbookId, spellId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbook', spellbookId] });
    },
  });
}

export function useRemoveSpellFromSpellbook(spellbookId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (spellId: string) => spellbookService.removeSpell(spellbookId, spellId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbook', spellbookId] });
    },
  });
}

export function useUpdatePreparedSpell(spellbookId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ spellId, isPrepared }: { spellId: string; isPrepared: boolean }) =>
      spellbookService.updatePreparedSpell(spellbookId, spellId, isPrepared),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbook', spellbookId] });
    },
  });
}

export function useDuplicateSpellbook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => spellbookService.duplicateSpellbook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}

export function useReorderSpellbooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      spellbookService.reorderSpellbooks(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spellbooks'] });
    },
  });
}
