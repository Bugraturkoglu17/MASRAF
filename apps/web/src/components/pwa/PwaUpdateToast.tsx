import { RefreshCw, X } from 'lucide-react';

import { usePwaUpdate } from '@/hooks/usePwaUpdate';

export function PwaUpdateToast(): JSX.Element | null {
  const { needRefresh, offlineReady, isUpdating, update, later, dismissOfflineReady } =
    usePwaUpdate();
  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="pwa-update-toast" role="status" aria-live="polite">
      <RefreshCw size={20} aria-hidden="true" />
      <div>
        <strong>
          {needRefresh ? 'Uygulamanın yeni bir sürümü hazır.' : 'Çevrimdışı kullanım hazır.'}
        </strong>
        {needRefresh && <span>Açık çalışmalarınız korunarak kontrollü güncelleme yapılır.</span>}
      </div>
      {needRefresh ? (
        <div className="pwa-update-actions">
          <button type="button" onClick={later} disabled={isUpdating}>
            Daha Sonra
          </button>
          <button type="button" onClick={() => void update()} disabled={isUpdating}>
            {isUpdating ? 'Güncelleniyor…' : 'Şimdi Güncelle'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="pwa-icon-button"
          onClick={dismissOfflineReady}
          aria-label="Bildirimi kapat"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
