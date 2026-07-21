/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface NetworkStatusValue {
  isOnline: boolean;
  isChecking: boolean;
  restoredAt: number | null;
  checkNow: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusValue | undefined>(undefined);
const API_ORIGIN = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');

async function verifyConnection(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${API_ORIGIN}/health/live`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    // API'ye ulaşılamıyor (timeout, ağ hatası vb.) ama tarayıcı online diyorsa
    // "internet yok" değil, "sunucu geçici olarak ulaşılamaz" durumudur.
    return navigator.onLine;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function NetworkStatusProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const lastOnline = useRef(isOnline);

  const checkNow = useCallback(async () => {
    setIsChecking(true);
    const verified = await verifyConnection();
    setIsOnline(verified);
    if (!lastOnline.current && verified) setRestoredAt(Date.now());
    lastOnline.current = verified;
    setIsChecking(false);
    return verified;
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      lastOnline.current = false;
      setIsOnline(false);
    };
    const handleOnline = () => void checkNow();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkNow();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(() => void checkNow(), 30_000);
    const initialCheck = window.setTimeout(() => void checkNow(), 0);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
      window.clearTimeout(initialCheck);
    };
  }, [checkNow]);

  const value = useMemo(
    () => ({ isOnline, isChecking, restoredAt, checkNow }),
    [checkNow, isChecking, isOnline, restoredAt],
  );
  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatus(): NetworkStatusValue {
  const context = useContext(NetworkStatusContext);
  if (!context) throw new Error('useNetworkStatus, NetworkStatusProvider içinde kullanılmalıdır.');
  return context;
}
