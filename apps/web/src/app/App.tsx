import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { PwaUpdatePrompt } from '@/components/feedback/PwaUpdatePrompt';
import { ToastProvider } from '@/components/feedback/toast-context';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { AuthProvider } from '@/features/auth/auth-context';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <OfflineBanner />
            <RouterProvider router={router} />
            <ToastViewport />
            <PwaUpdatePrompt />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
