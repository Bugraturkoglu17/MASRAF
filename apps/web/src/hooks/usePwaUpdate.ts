import { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_GUARD = 'masraf:pwa-update-in-progress';

export function usePwaUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  const update = useCallback(async () => {
    if (isUpdating || window.sessionStorage.getItem(UPDATE_GUARD) === '1') return;
    const hasUnsavedForm = document.documentElement.dataset.unsavedForm === 'true';
    if (
      hasUnsavedForm &&
      !window.confirm(
        'Kaydedilmemiş form veriniz var. Şimdi güncellerseniz ekran yenilenecek. Devam edilsin mi?',
      )
    ) {
      return;
    }
    setIsUpdating(true);
    window.sessionStorage.setItem(UPDATE_GUARD, '1');
    try {
      await updateServiceWorker(true);
    } catch {
      window.sessionStorage.removeItem(UPDATE_GUARD);
      setIsUpdating(false);
    }
  }, [isUpdating, updateServiceWorker]);

  const later = useCallback(() => setNeedRefresh(false), [setNeedRefresh]);
  const dismissOfflineReady = useCallback(() => setOfflineReady(false), [setOfflineReady]);

  return { needRefresh, offlineReady, isUpdating, update, later, dismissOfflineReady };
}
