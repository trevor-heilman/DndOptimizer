/**
 * Tests for analysis-related React Query mutation hooks.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAnalyzeSpell, useCompareSpells, useGetSpellEfficiency } from '../../hooks/useAnalysis';
import { mockAnalysisResult, mockComparisonResult, mockEfficiencyResponse } from '../mocks/handlers';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const baseContext = {
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

describe('useAnalyzeSpell', () => {
  it('returns analysis result after successful mutation', async () => {
    const { result } = renderHook(() => useAnalyzeSpell(), { wrapper: createWrapper() });
    result.current.mutate({ spellId: 'spell-1', context: baseContext });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAnalysisResult);
  });

  it('result contains expected_damage under results key', async () => {
    const { result } = renderHook(() => useAnalyzeSpell(), { wrapper: createWrapper() });
    result.current.mutate({ spellId: 'spell-1', context: baseContext });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results.expected_damage).toBe(17.5);
  });
});

describe('useCompareSpells', () => {
  it('returns comparison with winner field', async () => {
    const { result } = renderHook(() => useCompareSpells(), { wrapper: createWrapper() });
    result.current.mutate({ spellAId: 'spell-1', spellBId: 'spell-2', context: baseContext });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockComparisonResult);
    expect(result.current.data?.winner).toBe('spell_a');
  });
});

describe('useGetSpellEfficiency', () => {
  it('returns efficiency_by_slot data', async () => {
    const { result } = renderHook(() => useGetSpellEfficiency(), { wrapper: createWrapper() });
    result.current.mutate({ spellId: 'spell-1', context: baseContext, minLevel: 3, maxLevel: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEfficiencyResponse);
    expect(result.current.data?.efficiency_by_slot).toHaveLength(3);
  });

  it('each slot entry has numeric efficiency score', async () => {
    const { result } = renderHook(() => useGetSpellEfficiency(), { wrapper: createWrapper() });
    result.current.mutate({ spellId: 'spell-1', context: baseContext });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    result.current.data!.efficiency_by_slot.forEach((entry) => {
      expect(typeof entry.efficiency).toBe('number');
    });
  });
});
