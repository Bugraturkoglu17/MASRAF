import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiFetch, setAccessToken } from '@/lib/api-client';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface LoginResponse {
  accessToken: string;
  expiresIn: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/users/me');
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Sayfa açılışında httpOnly refresh cookie'si üzerinden sessiz oturum
  // geri yüklemesi denenir. Cookie yoksa/süresi dolmuşsa kullanıcı giriş
  // ekranında kalır; bu bir hata değildir.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await apiFetch<LoginResponse>('/auth/refresh', {
          method: 'POST',
          skipAuthRetry: true,
        });
        setAccessToken(tokens.accessToken);
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setAccessToken(null);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRetry: true,
    });
    setAccessToken(tokens.accessToken);
    setUser(await fetchCurrentUser());
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST', skipAuthRetry: true }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isInitializing, login, logout }),
    [user, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }
  return ctx;
}
