/**
 * Unit tests for useSpellbooks React Query hooks.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSpellbooks,
  useSpellbook,
  useCreateSpellbook,
  useDeleteSpellbook,
} from '../../hooks/useSpellbooks';
import { mockSpellbook } from '../mocks/handlers';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ─── useSpellbooks ────────────────────────────────────────────────────────────

describe('useSpellbooks', () => {
  it('returns the list of spellbooks', async () => {
    const { result } = renderHook(() => useSpellbooks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe(mockSpellbook.name);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useSpellbooks(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});

// ─── useSpellbook ─────────────────────────────────────────────────────────────

describe('useSpellbook', () => {
  it('is disabled when enabled=false', () => {
    const { result } = renderHook(
      () => useSpellbook(mockSpellbook.id, false),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ─── useCreateSpellbook ───────────────────────────────────────────────────────

describe('useCreateSpellbook', () => {
  it('creates a spellbook and returns the new object', async () => {
    const { result } = renderHook(() => useCreateSpellbook(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'New Tome' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('New Tome');
  });

  it('starts in idle/not-pending state before mutation', () => {
    const { result } = renderHook(() => useCreateSpellbook(), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isIdle).toBe(true);
  });
});

// ─── useDeleteSpellbook ───────────────────────────────────────────────────────

describe('useDeleteSpellbook', () => {
  it('resolves without error when deleting a spellbook', async () => {
    const { result } = renderHook(() => useDeleteSpellbook(), { wrapper: createWrapper() });
    result.current.mutate(mockSpellbook.id);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('is in idle state before mutation is called', () => {
    const { result } = renderHook(() => useDeleteSpellbook(), { wrapper: createWrapper() });
    expect(result.current.isIdle).toBe(true);
  });
});
