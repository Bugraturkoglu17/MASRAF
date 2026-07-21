import { CloudOff, RotateCw } from 'lucide-react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflinePage(): JSX.Element {
  const { isChecking, checkNow } = useNetworkStatus();
  return (
    <main className="offline-page">
      <CloudOff size={52} aria-hidden="true" />
      <h1>İnternet bağlantısı bulunamadı</h1>
      <p>
        Güvenli işlemler için bağlantınızı kontrol edin. Yerel masraf taslağınız cihazınızda
        korunur.
      </p>
      <button
        type="button"
        className="pwa-primary-button"
        onClick={() => void checkNow()}
        disabled={isChecking}
      >
        <RotateCw size={18} aria-hidden="true" />
        {isChecking ? 'Kontrol ediliyor…' : 'Tekrar Dene'}
      </button>
      <a href="/expenses/new">Yerel taslağa devam et</a>
    </main>
  );
}
