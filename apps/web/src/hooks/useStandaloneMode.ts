import { useEffect, useState } from 'react';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function getStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

export function useStandaloneMode(): boolean {
  const [isStandalone, setIsStandalone] = useState(getStandaloneMode);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => setIsStandalone(getStandaloneMode());
    media.addEventListener('change', update);
    window.addEventListener('appinstalled', update);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  return isStandalone;
}
