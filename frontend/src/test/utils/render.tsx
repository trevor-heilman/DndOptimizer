/**
 * Custom render utility that wraps components with all necessary providers.
 */
import type { ReactNode } from 'react';
import { render as tlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import type { AuthContextType } from '../../contexts/AuthContext';
import type { User } from '../../types/api';
import { mockUser } from '../mocks/handlers';

// ─── Default auth context values ─────────────────────────────────────────────

export const defaultAuthValue: AuthContextType = {
  user: mockUser as User,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue(undefined),
};

export const unauthenticatedAuthValue: AuthContextType = {
  ...defaultAuthValue,
  user: null,
  isAuthenticated: false,
};

export const loadingAuthValue: AuthContextType = {
  ...defaultAuthValue,
  isLoading: true,
};

// ─── Providers wrapper ────────────────────────────────────────────────────────

interface WrapperOptions {
  authValue?: typeof defaultAuthValue;
  initialEntries?: string[];
}

function createWrapper(options: WrapperOptions = {}) {
  const { authValue = defaultAuthValue, initialEntries = ['/'] } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            {children}
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

export function renderWithProviders(
  ui: ReactNode,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
  const { authValue, initialEntries, ...renderOptions } = options;
  return tlRender(ui, {
    wrapper: createWrapper({ authValue, initialEntries }),
    ...renderOptions,
  });
}

/** Creates a standalone QueryClient for hook tests via renderHook */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}
