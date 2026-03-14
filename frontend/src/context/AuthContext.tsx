'use client';

/**
 * Contexto de autenticación: única fuente de verdad para user/loading/error.
 * - Estado reactivo compartido por toda la app (Navbar, rutas protegidas, etc.).
 * - Login/register actualizan setUser() antes de redirigir para evitar parpadeo.
 * - Sesión por cookies httpOnly; loadUser() se ejecuta una vez al montar el provider.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as auth from '@/lib/auth';
import type { UserMe } from '@/lib/auth';

type AuthState = {
  user: UserMe | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  setUser: (user: UserMe | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const loadUser = useCallback(async () => {
    try {
      const user = await auth.fetchMe();
      setState({ user, loading: false, error: null });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        const refreshed = await auth.refreshSession();
        if (refreshed) {
          try {
            const user = await auth.fetchMe();
            setState({ user, loading: false, error: null });
            return;
          } catch {
            setState({ user: null, loading: false, error: null });
            return;
          }
        }
      }
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    await auth.logout();
    setState({ user: null, loading: false, error: null });
  }, []);

  const setUser = useCallback((user: UserMe | null) => {
    setState((s) => ({ ...s, user, loading: false }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      logout,
      refetch: loadUser,
      setUser,
    }),
    [state.user, state.loading, state.error, logout, loadUser, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useAuthContext();
}
