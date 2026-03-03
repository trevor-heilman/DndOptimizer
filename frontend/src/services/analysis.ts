/**
 * Analysis API service
 */
import apiClient from './api';
import type {
  AnalysisContext,
  SpellAnalysisResult,
  CompareSpellsRequest,
  CompareSpellsResponse,
} from '../types/api';

export const analysisService = {
  /**
   * Analyze a single spell
   */
  async analyzeSpell(
    spellId: string,
    context: AnalysisContext,
    slotLevel?: number
  ): Promise<SpellAnalysisResult> {
    const response = await apiClient.post<SpellAnalysisResult>('/analysis/analyze/', {
      spell_id: spellId,
      slot_level_override: slotLevel,
      ...context,
    });
    return response.data;
  },

  /**
   * Compare two spells
   */
  async compareSpells(request: CompareSpellsRequest): Promise<CompareSpellsResponse> {
    const response = await apiClient.post<CompareSpellsResponse>(
      '/analysis/compare/',
      request
    );
    return response.data;
  },

  /**
   * Get spell efficiency across slot levels
   */
  async getSpellEfficiency(
    spellId: string,
    context: AnalysisContext
  ): Promise<{ efficiency_data: any[] }> {
    const response = await apiClient.post(`/analysis/efficiency/`, {
      spell_id: spellId,
      ...context,
    });
    return response.data;
  },
};

export default analysisService;
