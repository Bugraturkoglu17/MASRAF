import { useEffect, useState } from 'react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OnlineRestoredToast(): JSX.Element | null {
  const { restoredAt } = useNetworkStatus();
  const [hiddenRestoredAt, setHiddenRestoredAt] = useState<number | null>(null);

  useEffect(() => {
    if (!restoredAt) return;
    const timeout = window.setTimeout(() => setHiddenRestoredAt(restoredAt), 4_000);
    return () => window.clearTimeout(timeout);
  }, [restoredAt]);

  if (!restoredAt || hiddenRestoredAt === restoredAt) return null;
  return (
    <div className="online-restored-toast" role="status">
      İnternet bağlantısı yeniden sağlandı.
    </div>
  );
}
