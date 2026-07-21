/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useStandaloneMode } from './useStandaloneMode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallContextValue {
  canInstall: boolean;
  isIosSafari: boolean;
  isStandalone: boolean;
  shouldOfferInstall: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
}

const DISMISS_KEY = 'masraf:pwa-install-dismissed-at';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

export function detectIosSafari(userAgent = navigator.userAgent): boolean {
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isWebKit && !isOtherIosBrowser;
}

function dismissedRecently(): boolean {
  const value = window.localStorage.getItem(DISMISS_KEY);
  if (!value) return false;
  return Date.now() - Number(value) < DISMISS_MS;
}

export function PwaInstallProvider({ children }: { children: ReactNode }): JSX.Element {
  const isStandalone = useStandaloneMode();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(dismissedRecently);
  const [isInstalled, setIsInstalled] = useState(false);
  const isIosSafari = detectIosSafari();

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      window.localStorage.removeItem(DISMISS_KEY);
      return true;
    }
    dismiss();
    return false;
  }, [dismiss, promptEvent]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(promptEvent),
      isIosSafari,
      isStandalone,
      shouldOfferInstall:
        !isStandalone && !isInstalled && !isDismissed && (Boolean(promptEvent) || isIosSafari),
      install,
      dismiss,
    }),
    [dismiss, install, isDismissed, isInstalled, isIosSafari, isStandalone, promptEvent],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error('usePwaInstall, PwaInstallProvider içinde kullanılmalıdır.');
  return context;
}
