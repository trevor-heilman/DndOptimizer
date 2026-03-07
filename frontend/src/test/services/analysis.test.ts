/**
 * Integration tests for the analysisService — HTTP calls intercepted by MSW.
 */
import { analysisService } from '../../services/analysis';
import {
  mockAnalysisResult,
  mockComparisonResult,
  mockEfficiencyResponse,
} from '../mocks/handlers';

const defaultContext = {
  target_ac: 15,
  caster_attack_bonus: 5,
  spell_save_dc: 15,
  target_save_bonus: 0,
  number_of_targets: 1,
  advantage: false,
  disadvantage: false,
  spell_slot_level: 3,
  crit_enabled: false,
  half_damage_on_save: true,
  evasion_enabled: false,
};

describe('analysisService.analyzeSpell', () => {
  it('returns analysis results for a spell', async () => {
    const result = await analysisService.analyzeSpell('spell-1', defaultContext);
    expect(result).toEqual(mockAnalysisResult);
  });

  it('result has expected_damage in results', async () => {
    const result = await analysisService.analyzeSpell('spell-1', defaultContext);
    expect(result.results.expected_damage).toBeGreaterThan(0);
  });
});

describe('analysisService.compareSpells', () => {
  it('returns comparison with a winner', async () => {
    const result = await analysisService.compareSpells({
      spell_a_id: 'spell-1',
      spell_b_id: 'spell-2',
      ...defaultContext,
    });
    expect(result).toEqual(mockComparisonResult);
    expect(result.winner).toBe('spell_a');
  });
});

describe('analysisService.getSpellEfficiency', () => {
  it('returns efficiency_by_slot array', async () => {
    const result = await analysisService.getSpellEfficiency('spell-1', defaultContext, 3, 5);
    expect(result).toEqual(mockEfficiencyResponse);
    expect(result.efficiency_by_slot).toHaveLength(3);
  });

  it('each slot entry has a slot_level and expected_damage', async () => {
    const result = await analysisService.getSpellEfficiency('spell-1', defaultContext);
    result.efficiency_by_slot.forEach((entry) => {
      expect(entry).toHaveProperty('slot_level');
      expect(entry).toHaveProperty('expected_damage');
      expect(entry).toHaveProperty('efficiency');
    });
  });
});
