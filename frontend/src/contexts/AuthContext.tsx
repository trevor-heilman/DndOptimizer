/**
 * Authentication Context
 *
 * Includes inactivity-based session timeout:
 *   - Warning shown INACTIVITY_WARN_MS before expiry
 *   - Auto-logout after INACTIVITY_TIMEOUT_MS of no activity
 *   - Any mouse/key/click/scroll event resets the timer
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/api';
import authService from '../services/auth';
import { storage } from '../utils/storage';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_WARN_MS    =  5 * 60 * 1000; //  5 minute warning before logout

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export type { AuthContextType };
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_WARN_MS / 1000);

  const warnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current)   clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current)   clearInterval(countdownRef.current);
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    setShowTimeoutWarning(false);
    authService.logout();
    setUser(null);
  }, [clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();
    setShowTimeoutWarning(false);

    warnTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setSecondsLeft(INACTIVITY_WARN_MS / 1000);

      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - INACTIVITY_WARN_MS);

    logoutTimerRef.current = setTimeout(() => logout(), INACTIVITY_TIMEOUT_MS);
  }, [clearTimers, logout]);

  // Attach / detach activity listeners while a user is logged in
  useEffect(() => {
    if (!user) {
      clearTimers();
      setShowTimeoutWarning(false);
      return;
    }

    ACTIVITY_EVENTS.forEach(ev =>
      document.addEventListener(ev, resetTimer, { passive: true })
    );
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach(ev => document.removeEventListener(ev, resetTimer));
      clearTimers();
    };
  }, [user, resetTimer, clearTimers]);

  useEffect(() => {
    // Initialize auth state from localStorage
    const initAuth = async () => {
      const storedUser = storage.getUser();
      const token = storage.getAccessToken();

      if (storedUser && token) {
        setUser(storedUser);

        // Optionally refresh user data from server
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          // Token might be expired, clear storage
          storage.clearAll();
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
  };

  const register = async (email: string, password: string, passwordConfirm: string) => {
    const response = await authService.register({
      email,
      password,
      password_confirm: passwordConfirm,
    });
    setUser(response.user);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Session timeout warning dialog */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
          <div className="dnd-card mx-4 max-w-sm w-full p-6 border-t-2 border-gold-600 shadow-2xl shadow-gold-900/30">
            <h2 className="font-display text-gold-300 text-xl mb-1">Session Expiring</h2>
            <p className="text-smoke-300 text-sm mb-4">
              You've been inactive for a while. For your security, you will be
              automatically logged out in{' '}
              <span className="text-gold-400 font-semibold">{countdownDisplay}</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout Now
              </button>
              <button
                onClick={resetTimer}
                className="btn-primary text-sm"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
