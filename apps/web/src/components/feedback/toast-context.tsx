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

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  detail?: string;
  state: 'visible' | 'exiting';
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant, detail?: string) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 2800;
const EXIT_ANIMATION_MS = 240;
const MAX_VISIBLE_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const autoDismissTimers = useRef(new Map<number, number>());
  const removalTimers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const autoDismissTimer = autoDismissTimers.current.get(id);
    if (autoDismissTimer !== undefined) {
      window.clearTimeout(autoDismissTimer);
      autoDismissTimers.current.delete(id);
    }

    setToasts((current) =>
      current.map((toast) =>
        toast.id === id && toast.state !== 'exiting' ? { ...toast, state: 'exiting' } : toast,
      ),
    );

    if (removalTimers.current.has(id)) return;

    const removalTimer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      removalTimers.current.delete(id);
    }, EXIT_ANIMATION_MS);
    removalTimers.current.set(id, removalTimer);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', detail?: string) => {
      const id = ++idRef.current;
      setToasts((current) => [
        ...current.slice(-(MAX_VISIBLE_TOASTS - 1)),
        { id, message, variant, detail, state: 'visible' },
      ]);
      const timer = window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
      autoDismissTimers.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      autoDismissTimers.current.forEach((timer) => window.clearTimeout(timer));
      removalTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return ctx;
}
