import { Download } from 'lucide-react';

import { useToast } from '@/components/feedback/toast-context';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallButton(): JSX.Element | null {
  const { canInstall, install, isStandalone } = usePwaInstall();
  const { showToast } = useToast();
  if (!canInstall || isStandalone) return null;

  const handleInstall = async () => {
    if (await install()) showToast('Uygulama ana ekrana eklendi.', 'success');
  };

  return (
    <button type="button" className="pwa-primary-button" onClick={() => void handleInstall()}>
      <Download size={18} aria-hidden="true" />
      Ana Ekrana Ekle
    </button>
  );
}
