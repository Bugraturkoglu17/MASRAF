import { useEffect, useState } from 'react';

/**
 * Tarayıcının online/offline olaylarını dinler. Masraf oluşturma gibi
 * kritik işlemler bu bileşenden bağımsızdır; component yalnızca kullanıcıyı
 * bilgilendirir, veri kaybını önlemek ilgili form/servis katmanının işidir.
 */
export function OfflineBanner(): JSX.Element | null {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      style={{
        background: 'var(--color-warning-bg)',
        color: 'var(--color-warning)',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 14,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      İnternet bağlantınız yok. Masraf oluşturma ve güncel veriler bağlantı gelene kadar
      kullanılamaz; yarım kalan işlemler kaybolabilir.
    </div>
  );
}
