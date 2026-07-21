import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { MaintenanceBanner } from '@/components/feedback/MaintenanceBanner';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { PwaUpdatePrompt } from '@/components/feedback/PwaUpdatePrompt';
import { ToastProvider } from '@/components/feedback/toast-context';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { IosInstallGuide } from '@/components/pwa/IosInstallGuide';
import { OnlineRestoredToast } from '@/components/pwa/OnlineRestoredToast';
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner';
import { AuthProvider } from '@/features/auth/auth-context';
import { NetworkStatusProvider } from '@/hooks/useNetworkStatus';
import { PwaInstallProvider } from '@/hooks/usePwaInstall';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NetworkStatusProvider>
            <PwaInstallProvider>
              <AuthProvider>
                <OfflineBanner />
                <MaintenanceBanner />
                <OnlineRestoredToast />
                <RouterProvider router={router} />
                <ToastViewport />
                <PwaInstallBanner />
                <IosInstallGuide />
                <PwaUpdatePrompt />
              </AuthProvider>
            </PwaInstallProvider>
          </NetworkStatusProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
