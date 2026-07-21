import { Share, X } from 'lucide-react';

import { usePwaInstall } from '@/hooks/usePwaInstall';

export function IosInstallGuide(): JSX.Element | null {
  const { dismiss, isIosSafari, shouldOfferInstall } = usePwaInstall();
  if (!isIosSafari || !shouldOfferInstall) return null;

  return (
    <div className="pwa-sheet-backdrop" role="presentation">
      <section
        className="pwa-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-install-title"
      >
        <div className="pwa-sheet-handle" aria-hidden="true" />
        <button
          type="button"
          className="pwa-sheet-close"
          onClick={dismiss}
          aria-label="Kurulum açıklamasını kapat"
        >
          <X size={20} />
        </button>
        <Share size={32} color="var(--color-primary)" aria-hidden="true" />
        <h2 id="ios-install-title">Ana Ekrana Ekle</h2>
        <ol>
          <li>Safari’de Paylaş butonuna dokunun.</li>
          <li>“Ana Ekrana Ekle” seçeneğini seçin.</li>
          <li>“Ekle” butonuna dokunun.</li>
        </ol>
        <button type="button" className="pwa-primary-button" onClick={dismiss}>
          Anladım
        </button>
      </section>
    </div>
  );
}
