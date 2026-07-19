import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * vite-plugin-pwa'nın autoUpdate service worker kaydını sarmalar. Yeni bir
 * sürüm önbelleğe alındığında kullanıcıya bildirim gösterir; onay vermeden
 * sekme kendiliğinden yenilenmez (kritik bir form doldururken veri kaybını
 * önler).
 */
export function PwaUpdatePrompt(): JSX.Element | null {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
      }}
    >
      <span>
        {needRefresh
          ? 'Uygulamanın yeni bir sürümü hazır.'
          : 'Uygulama çevrimdışı kullanım için hazır.'}
      </span>
      {needRefresh ? (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-contrast)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Güncelle
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOfflineReady(false)}
          aria-label="Kapat"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        >
          ×
        </button>
      )}
    </div>
  );
}
