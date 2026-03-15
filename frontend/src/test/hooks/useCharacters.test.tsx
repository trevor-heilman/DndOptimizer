/**
 * Unit tests for useCharacters React Query hooks.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCharacters,
  useCharacter,
  useCreateCharacter,
  useDeleteCharacter,
} from '../../hooks/useCharacters';
import { mockCharacter } from '../mocks/handlers';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ─── useCharacters ────────────────────────────────────────────────────────────

describe('useCharacters', () => {
  it('returns the list of characters', async () => {
    const { result } = renderHook(() => useCharacters(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe(mockCharacter.name);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useCharacters(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});

// ─── useCharacter ─────────────────────────────────────────────────────────────

describe('useCharacter', () => {
  it('fetches a single character by id', async () => {
    const { result } = renderHook(
      () => useCharacter(mockCharacter.id),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe(mockCharacter.name);
  });

  it('is disabled when enabled=false', () => {
    const { result } = renderHook(
      () => useCharacter(mockCharacter.id, false),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ─── useCreateCharacter ───────────────────────────────────────────────────────

describe('useCreateCharacter', () => {
  it('creates a character and returns the new object', async () => {
    const { result } = renderHook(() => useCreateCharacter(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'New Hero', character_level: 1, ruleset: '2014' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('New Hero');
  });

  it('is in idle state before mutation is called', () => {
    const { result } = renderHook(() => useCreateCharacter(), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isIdle).toBe(true);
  });
});

// ─── useDeleteCharacter ───────────────────────────────────────────────────────

describe('useDeleteCharacter', () => {
  it('resolves without error when deleting a character', async () => {
    const { result } = renderHook(() => useDeleteCharacter(), { wrapper: createWrapper() });
    result.current.mutate(mockCharacter.id);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('is in idle state before mutation is called', () => {
    const { result } = renderHook(() => useDeleteCharacter(), { wrapper: createWrapper() });
    expect(result.current.isIdle).toBe(true);
  });
});
