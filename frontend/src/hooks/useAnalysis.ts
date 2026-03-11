/**
 * React Query hooks for analysis
 */
import { useMutation } from '@tanstack/react-query';
import analysisService from '../services/analysis';
import type { AnalysisContext, SpellAnalysisApiResult } from '../types/api';

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

/** Analyze multiple spells in parallel, returning results keyed by spell ID. */
export function useBatchAnalyzeSpells() {
  return useMutation({
    mutationFn: async ({
      spellIds,
      context,
    }: {
      spellIds: string[];
      context: AnalysisContext;
    }): Promise<Record<string, SpellAnalysisApiResult>> => {
      const settled = await Promise.allSettled(
        spellIds.map((id) => analysisService.analyzeSpell(id, context))
      );
      const out: Record<string, SpellAnalysisApiResult> = {};
      settled.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          out[spellIds[idx]] = result.value;
        }
      });
      return out;
    },
  });
}

