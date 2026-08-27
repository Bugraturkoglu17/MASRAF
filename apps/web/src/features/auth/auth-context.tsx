import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, apiFetch, setAccessToken } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

export type AppRole = 'USER' | 'MANAGER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  iban?: string;
  role: AppRole;
  profileCompleted: boolean;
  mustChangePassword: boolean;
  organizationId: string;
  organization?: { name: string };
}

interface LoginResponse {
  accessToken: string;
  expiresIn: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (identifier: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/users/me', { signal });
}

const SESSION_RETRY_DELAY_MS = 300;

// Ağ hatası (statusCode 0) veya sunucu hatası (5xx) — Neon scale-to-zero'dan
// uyanırken oluşabilecek geçici arızalarla eşleşir. 401 burada YOK: geçersiz/
// olmayan bir oturum anlamına gelir, tekrar denemek sonucu değiştirmez.
function isTransientAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 0 || error.statusCode >= 500);
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    const attemptSession = async (): Promise<CurrentUser> => {
      const tokens = await apiFetch<LoginResponse>('/auth/refresh', {
        method: 'POST',
        skipAuthRetry: true,
        signal: controller.signal,
      });
      setAccessToken(tokens.accessToken);
      return fetchCurrentUser(controller.signal);
    };

    (async () => {
      try {
        const me = await attemptSession();
        if (!cancelled) setUser(me);
      } catch (error) {
        // Sonsuz döngü yok: yalnızca 1 tekrar deneme, yalnızca geçici
        // ağ/sunucu hatalarında. Gerçek "oturum yok" (401) durumunda
        // doğrudan giriş ekranına düşülür.
        if (isTransientAuthError(error) && !cancelled) {
          await new Promise((resolve) => window.setTimeout(resolve, SESSION_RETRY_DELAY_MS));
        }
        if (isTransientAuthError(error) && !cancelled) {
          try {
            const me = await attemptSession();
            if (!cancelled) setUser(me);
          } catch {
            if (!cancelled) setAccessToken(null);
          }
        } else if (!cancelled) {
          setAccessToken(null);
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    queryClient.clear();
    const tokens = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      skipAuthRetry: true,
    });
    setAccessToken(tokens.accessToken);
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST', skipAuthRetry: true }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchCurrentUser();
    setUser(me);
    return me;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isInitializing, login, logout, refreshUser }),
    [user, isInitializing, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}
