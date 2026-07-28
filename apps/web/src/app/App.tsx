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
import { useKeyboardAware } from '@/hooks/useKeyboardAware';
import { NetworkStatusProvider } from '@/hooks/useNetworkStatus';
import { PwaInstallProvider } from '@/hooks/usePwaInstall';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';

function KeyboardAwareRoot(): null {
  useKeyboardAware();
  return null;
}

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NetworkStatusProvider>
            <PwaInstallProvider>
              <AuthProvider>
                <KeyboardAwareRoot />
                <OfflineBanner />
                <MaintenanceBanner />
                <OnlineRestoredToast />
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
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
