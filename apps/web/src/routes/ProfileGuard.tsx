import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';

export function ProfileGuard(): JSX.Element {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.profileCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}
