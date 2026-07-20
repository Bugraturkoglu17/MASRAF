import { Navigate, Outlet } from 'react-router-dom';

import { useAuth, type AppRole } from '@/features/auth/auth-context';

interface RoleRouteProps {
  allowed: AppRole[];
}

export function RoleRoute({ allowed }: RoleRouteProps): JSX.Element {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowed.includes(user.role)) {
    // Role'e göre doğru ana sayfaya yönlendir
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
