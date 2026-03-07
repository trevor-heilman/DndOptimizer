/**
 * Tests for spell-related React Query hooks.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSpells, useSpell, useCreateSpell, useDeleteSpell } from '../../hooks/useSpells';
import { mockSpell, mockSpell2 } from '../mocks/handlers';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useSpells', () => {
  it('returns paginated spell list', async () => {
    const { result } = renderHook(() => useSpells(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toHaveLength(2);
    expect(result.current.data?.results[0].name).toBe('Fireball');
  });

  it('returns count from response', async () => {
    const { result } = renderHook(() => useSpells(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(2);
  });
});

describe('useSpell', () => {
  it('returns spell detail by id', async () => {
    const { result } = renderHook(() => useSpell(mockSpell.id), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Fireball');
  });

  it('is disabled when id is empty string', () => {
    const { result } = renderHook(() => useSpell(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateSpell', () => {
  it('mutates successfully and returns the new spell', async () => {
    const { result } = renderHook(() => useCreateSpell(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'Ice Storm', level: 4, school: 'evocation' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Ice Storm');
  });
});

describe('useDeleteSpell', () => {
  it('mutates with DELETE and resolves without error', async () => {
    const { result } = renderHook(() => useDeleteSpell(), { wrapper: createWrapper() });
    result.current.mutate(mockSpell2.id);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
