import { WifiOff } from 'lucide-react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Tarayıcının online/offline olaylarını dinler. Masraf oluşturma gibi
 * kritik işlemler bu bileşenden bağımsızdır; component yalnızca kullanıcıyı
 * bilgilendirir, veri kaybını önlemek ilgili form/servis katmanının işidir.
 */
export function OfflineBanner(): JSX.Element | null {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div role="alert" className="offline-banner">
      <WifiOff size={17} aria-hidden="true" />
      İnternet bağlantınız yok. Bazı işlemler kullanılamıyor.
    </div>
  );
}
