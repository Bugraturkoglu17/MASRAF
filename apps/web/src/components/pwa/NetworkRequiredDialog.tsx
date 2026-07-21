import { WifiOff } from 'lucide-react';

export function NetworkRequiredDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="pwa-sheet-backdrop" role="presentation">
      <section
        className="network-required-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="network-required-title"
      >
        <WifiOff size={36} aria-hidden="true" />
        <h2 id="network-required-title">İnternet bağlantısı gerekli</h2>
        <p>
          Bu işlem çevrimdışıyken güvenli biçimde tamamlanamaz. Formunuz yerel taslak olarak
          korunuyor.
        </p>
        <button type="button" className="pwa-primary-button" onClick={onClose}>
          Tamam
        </button>
      </section>
    </div>
  );
}
