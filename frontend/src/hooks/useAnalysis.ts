/**
 * React Query hooks for analysis
 */
import { useMutation } from '@tanstack/react-query';
import analysisService from '../services/analysis';
import type { AnalysisContext } from '../types/api';

export function useAnalyzeSpell() {
  return useMutation({
    mutationFn: ({ spellId, context }: { spellId: string; context: AnalysisContext }) =>
      analysisService.analyzeSpell(spellId, context),
  });
}

export function useCompareSpells() {
  return useMutation({
    mutationFn: ({ spellAId, spellBId, context }: { spellAId: string; spellBId: string; context: AnalysisContext }) =>
      analysisService.compareSpells({ spell_a_id: spellAId, spell_b_id: spellBId, ...context }),
  });
}

export function useGetSpellEfficiency() {
  return useMutation({
    mutationFn: ({
      spellId,
      context,
      minLevel,
      maxLevel,
    }: {
      spellId: string;
      context: AnalysisContext;
      minLevel?: number;
      maxLevel?: number;
    }) => analysisService.getSpellEfficiency(spellId, context, minLevel, maxLevel),
  });
}
