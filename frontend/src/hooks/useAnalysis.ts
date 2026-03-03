/**
 * React Query hooks for analysis
 */
import { useMutation } from '@tanstack/react-query';
import * as analysisService from '../services/analysis';
import type { AnalysisContext, SpellAnalysisResult, CompareSpellsResponse } from '../types/api';

export function useAnalyzeSpell() {
  return useMutation({
    mutationFn: ({ spellId, context }: { spellId: string; context: AnalysisContext }) =>
      analysisService.analyzeSpell(spellId, context),
  });
}

export function useCompareSpells() {
  return useMutation({
    mutationFn: ({ spellAId, spellBId, context }: { spellAId: string; spellBId: string; context: AnalysisContext }) =>
      analysisService.compareSpells(spellAId, spellBId, context),
  });
}

export function useGetSpellEfficiency() {
  return useMutation({
    mutationFn: ({ spellId, context }: { spellId: string; context: AnalysisContext }) =>
      analysisService.getSpellEfficiency(spellId, context),
  });
}
