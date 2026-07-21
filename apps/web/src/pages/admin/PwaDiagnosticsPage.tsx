import { useEffect, useState } from 'react';

import { PwaDisplayModeIndicator } from '@/components/pwa/PwaDisplayModeIndicator';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';
import { useAuth } from '@/features/auth/auth-context';
import { useLocalExpenseDraft } from '@/hooks/useLocalExpenseDraft';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface Diagnostics {
  serviceWorkerRegistered: boolean;
  serviceWorkerWaiting: boolean;
  manifestLoaded: boolean;
  cacheNames: string[];
}

export function PwaDiagnosticsPage(): JSX.Element {
  const { user } = useAuth();
  const { isOnline, isChecking, checkNow } = useNetworkStatus();
  const { canInstall } = usePwaInstall();
  const { draft } = useLocalExpenseDraft(user?.id, user?.organizationId);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    serviceWorkerRegistered: false,
    serviceWorkerWaiting: false,
    manifestLoaded: false,
    cacheNames: [],
  });

  useEffect(() => {
    void (async () => {
      const registration =
        'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      const cacheNames = 'caches' in window ? await caches.keys() : [];
      setDiagnostics({
        serviceWorkerRegistered: Boolean(registration),
        serviceWorkerWaiting: Boolean(registration?.waiting),
        manifestLoaded: Boolean(manifest?.href),
        cacheNames: cacheNames.filter((name) => name.startsWith('masraf')),
      });
    })();
  }, []);

  const rows = [
    ['Service worker kayıtlı mı?', diagnostics.serviceWorkerRegistered ? 'Evet' : 'Hayır'],
    ['Uygulama sürümü', __APP_VERSION__],
    ['Manifest yüklendi mi?', diagnostics.manifestLoaded ? 'Evet' : 'Hayır'],
    ['Görüntüleme modu', <PwaDisplayModeIndicator key="display-mode" />],
    ['Install prompt destekleniyor mu?', canInstall ? 'Evet' : 'Hayır'],
    ['Çevrimiçi mi?', isOnline ? 'Evet' : 'Hayır'],
    ['Cache adı ve sürümü', diagnostics.cacheNames.join(', ') || 'Henüz cache yok'],
    ['Yeni sürüm bekliyor mu?', diagnostics.serviceWorkerWaiting ? 'Evet' : 'Hayır'],
    ['Local draft mevcut mu?', draft ? 'Evet' : 'Hayır'],
  ] as const;

  return (
    <section style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px' }}>PWA Tanılama</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Yalnızca geliştirme ortamında ve admin rolünde görünür. Gizli sistem bilgisi içermez.
      </p>
      <dl style={{ display: 'grid', gap: 10, marginTop: 22 }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 16,
              padding: 14,
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              background: 'var(--color-surface)',
            }}
          >
            <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
            <dd
              style={{ margin: 0, fontWeight: 700, textAlign: 'right', overflowWrap: 'anywhere' }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
        <button
          type="button"
          className="pwa-primary-button"
          onClick={() => void checkNow()}
          disabled={isChecking}
        >
          {isChecking ? 'Kontrol ediliyor…' : 'Bağlantıyı Kontrol Et'}
        </button>
        <PwaInstallButton />
      </div>
    </section>
  );
}
