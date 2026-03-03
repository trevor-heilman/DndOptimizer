/**
 * Custom hook for fetching spells
 */
import { useQuery } from '@tanstack/react-query';
import spellService from '../services/spells';
import type { SpellListParams } from '../types/api';

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
