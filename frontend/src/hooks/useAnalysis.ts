/**
 * React Query hooks for analysis
 */
import { useMutation } from '@tanstack/react-query';
import analysisService from '../services/analysis';
import type { AnalysisContext, SpellAnalysisApiResult, BreakevenRequest, CompareGrowthRequest } from '../types/api';

export function useAnalyzeSpell() {
  return useMutation({
    mutationFn: ({ spellId, context }: { spellId: string; context: AnalysisContext }) =>
      analysisService.analyzeSpell(spellId, context),
  });
}

export function useCompareSpells() {
  return useMutation({
    mutationFn: ({
      spellAId,
      spellBId,
      context,
      overridesA,
      overridesB,
    }: {
      spellAId: string;
      spellBId: string;
      context: AnalysisContext;
      overridesA?: { number_of_targets?: number; resistance?: boolean };
      overridesB?: { number_of_targets?: number; resistance?: boolean };
    }) =>
      analysisService.compareSpells({
        spell_a_id: spellAId,
        spell_b_id: spellBId,
        ...context,
        ...(overridesA?.number_of_targets !== undefined && { number_of_targets_a: overridesA.number_of_targets }),
        ...(overridesA?.resistance !== undefined && { resistance_a: overridesA.resistance }),
        ...(overridesB?.number_of_targets !== undefined && { number_of_targets_b: overridesB.number_of_targets }),
        ...(overridesB?.resistance !== undefined && { resistance_b: overridesB.resistance }),
      }),
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

/** Analyze multiple spells in batches, capping concurrent requests to avoid overwhelming the server. */
export function useBatchAnalyzeSpells() {
  return useMutation({
    mutationFn: async ({
      spellIds,
      context,
      concurrency = 5,
    }: {
      spellIds: string[];
      context: AnalysisContext;
      concurrency?: number;
    }): Promise<Record<string, SpellAnalysisApiResult>> => {
      const out: Record<string, SpellAnalysisApiResult> = {};
      for (let i = 0; i < spellIds.length; i += concurrency) {
        const batch = spellIds.slice(i, i + concurrency);
        const settled = await Promise.allSettled(
          batch.map((id) => analysisService.analyzeSpell(id, context))
        );
        settled.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            out[batch[idx]] = result.value;
          }
        });
      }
      return out;
    },
  });
}

export function useBreakevenAnalysis() {
  return useMutation({
    mutationFn: (request: BreakevenRequest) => analysisService.breakevenAnalysis(request),
  });
}

export function useCompareGrowth() {
  return useMutation({
    mutationFn: (request: CompareGrowthRequest) => analysisService.compareGrowth(request),
  });
}
