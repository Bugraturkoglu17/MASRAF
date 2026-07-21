import { Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PublicAppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export function MaintenanceBanner(): JSX.Element | null {
  const [config, setConfig] = useState<PublicAppConfig | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${API_BASE_URL}/app/config`, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) setConfig((await response.json()) as PublicAppConfig);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!config?.maintenanceMode) return null;
  return (
    <div role="alert" className="maintenance-banner">
      <Wrench size={17} aria-hidden="true" />
      <span>{config.maintenanceMessage}</span>
    </div>
  );
}
