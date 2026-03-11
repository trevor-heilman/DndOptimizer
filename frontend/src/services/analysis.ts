/**
 * Analysis API service
 */
import apiClient from './api';
import type {
  AnalysisContext,
  SpellAnalysisApiResult,
  SpellEfficiencyResponse,
  CompareSpellsRequest,
  CompareSpellsResponse,
} from '../types/api';

export const analysisService = {
  /**
   * Analyze a single spell at a given combat context.
   * POST /api/analysis/analyze/
   */
  async analyzeSpell(
    spellId: string,
    context: AnalysisContext
  ): Promise<SpellAnalysisApiResult> {
    const response = await apiClient.post<SpellAnalysisApiResult>('/analysis/analyze/', {
      spell_id: spellId,
      ...context,
    });
    return response.data;
  },

  /**
   * Compare two spells in a given context.
   * POST /api/analysis/compare/
   * The backend wraps analysis in a SpellComparison model; we return just the
   * `results` sub-object which matches CompareSpellsResponse.
   */
  async compareSpells(request: CompareSpellsRequest): Promise<CompareSpellsResponse> {
    const response = await apiClient.post<{ results: CompareSpellsResponse }>(
      '/analysis/compare/',
      request
    );
    return response.data.results;
  },

  /**
   * Get spell efficiency across slot levels.
   * POST /api/analysis/efficiency/
   */
  async getSpellEfficiency(
    spellId: string,
    context: AnalysisContext,
    minLevel = 1,
    maxLevel = 9
  ): Promise<SpellEfficiencyResponse> {
    const response = await apiClient.post<SpellEfficiencyResponse>('/analysis/efficiency/', {
      spell_id: spellId,
      min_slot_level: minLevel,
      max_slot_level: maxLevel,
      ...context,
    });
    return response.data;
  },
};

export default analysisService;
