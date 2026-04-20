import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearAdapterCache } from '../adapters';

// ── Types ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tier: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial /auth/me check is in-flight */
  checking: boolean;
  /** Redirect the browser to the Google OAuth flow */
  signIn: () => void;
  /** POST /auth/logout, clear cookies, redirect home */
  signOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      let res = await fetch('/auth/me', { credentials: 'include' });
      // Access token expired — try to refresh silently before giving up
      if (res.status === 401) {
        const refreshed = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
        if (refreshed.ok) {
          res = await fetch('/auth/me', { credentials: 'include' });
        }
      }
      setUser(res.ok ? (await res.json() as AuthUser) : null);
    }
    checkAuth().catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);

  const signIn = () => {
    window.location.href = '/auth/google';
  };

  const signOut = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Best-effort: clear cookies server-side; continue regardless
    }
    clearAdapterCache(); // force re-resolve to LocalAdapter on next load
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
