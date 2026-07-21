import { Download, X } from 'lucide-react';

import { useToast } from '@/components/feedback/toast-context';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallBanner(): JSX.Element | null {
  const { canInstall, install, dismiss, shouldOfferInstall, isIosSafari } = usePwaInstall();
  const { showToast } = useToast();

  if (!shouldOfferInstall || isIosSafari || !canInstall) return null;

  const handleInstall = async () => {
    if (await install()) showToast('Uygulama başarıyla ana ekrana eklendi.', 'success');
  };

  return (
    <aside className="pwa-install-banner" aria-label="Uygulama kurulumu">
      <Download size={22} aria-hidden="true" />
      <div>
        <strong>Masraf uygulamasını kurun</strong>
        <span>Daha hızlı erişim ve uygulama görünümü için ana ekranınıza ekleyin.</span>
      </div>
      <button type="button" onClick={() => void handleInstall()}>
        Ana Ekrana Ekle
      </button>
      <button
        type="button"
        className="pwa-icon-button"
        onClick={dismiss}
        aria-label="Kurulum önerisini kapat"
      >
        <X size={18} />
      </button>
    </aside>
  );
}
