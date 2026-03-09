/**
 * Login Page
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertMessage } from '../components/ui';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-smoke-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3" aria-hidden="true">🔮</div>
          <h2 className="font-display text-3xl font-bold text-gold-300 tracking-wide">
            Enter the Vault
          </h2>
          <p className="mt-2 font-body text-sm text-parchment-400">
            New to the order?{' '}
            <Link to="/register" className="font-semibold text-gold-400 hover:text-gold-300 transition-colors">
              Claim your tome
            </Link>
          </p>
        </div>

        {/* Form Card */}
        <div className="dnd-card border-t-2 border-gold-800 p-8 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && <AlertMessage variant="error" message={error} />}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="dnd-input font-body"
                  placeholder="wizard@arcane.academy"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dnd-input font-body"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Channeling magic...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
