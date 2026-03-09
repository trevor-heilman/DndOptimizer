/**
 * Register Page
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertMessage } from '../components/ui';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, passwordConfirm);
      navigate('/');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData) {
        const errorMessage = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        setError(errorMessage || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-smoke-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-3" aria-hidden="true">📜</div>
          <h2 className="font-display text-3xl font-bold text-gold-300 tracking-wide">
            Join the Order
          </h2>
          <p className="mt-2 font-body text-sm text-parchment-400">
            Already a member?{' '}
            <Link to="/login" className="font-semibold text-gold-400 hover:text-gold-300 transition-colors">
              Return to the vault
            </Link>
          </p>
        </div>

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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dnd-input font-body"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="password-confirm" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                Confirm Password
              </label>
              <input
                id="password-confirm"
                name="password-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
            {isLoading ? 'Inscribing your name...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  </div>
  );
}

export default RegisterPage;
