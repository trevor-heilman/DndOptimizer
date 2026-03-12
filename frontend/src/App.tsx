/**
 * Main App Component with Routing
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { ComparePage } from './pages/ComparePage';
import { AdminReviewPage } from './pages/AdminReviewPage';

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/spells" element={<SpellsPage />} />
                <Route path="/spells/:id" element={<SpellDetailPage />} />
                <Route path="/spellbooks" element={<SpellbooksPage />} />
                <Route path="/spellbooks/:id" element={<SpellbookDetailPage />} />
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
  );
}

export default App;
