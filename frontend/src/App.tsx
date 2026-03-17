/**
 * Main App Component with Routing
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, type ReactNode, type ErrorInfo } from 'react';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface EBState { error: Error | null }

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#f87171', background: '#0a0a14', minHeight: '100vh' }}>
          <h1 style={{ color: '#fbbf24', fontSize: '1.25rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#fca5a5' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { SpellsPage } from './pages/SpellsPage';
import { SpellDetailPage } from './pages/SpellDetailPage';
import { SpellbooksPage } from './pages/SpellbooksPage';
import { SpellbookDetailPage } from './pages/SpellbookDetailPage';
import { CharacterSpellsPage } from './pages/CharacterSpellsPage';
import { ComparePage } from './pages/ComparePage';
import { AdminReviewPage } from './pages/AdminReviewPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/spells" element={<SpellsPage />} />
                <Route path="/spells/:id" element={<SpellDetailPage />} />
                <Route path="/spellbooks" element={<SpellbooksPage />} />
                <Route path="/spellbooks/:id" element={<SpellbookDetailPage />} />
                <Route path="/characters/:id/spells" element={<CharacterSpellsPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/admin/review" element={<AdminReviewPage />} />
              </Route>
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
