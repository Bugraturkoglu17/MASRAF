import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { FullScreenLoader } from '@/components/feedback/FullScreenLoader';
import { useAuth } from '@/features/auth/auth-context';

export function ProtectedRoute(): JSX.Element {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <FullScreenLoader label="Oturum kontrol ediliyor..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
