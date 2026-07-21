import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AppSplashScreen } from '@/components/pwa/AppSplashScreen';
import { useAuth } from '@/features/auth/auth-context';

export function ProtectedRoute(): JSX.Element {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <AppSplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
