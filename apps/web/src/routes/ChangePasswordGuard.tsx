import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { getRoleHome } from '@/features/auth/role-home';

/** Geçici şifre kullanan kullanıcıyı zorunlu şifre değiştirme ekranına yönlendirir. */
export function ChangePasswordGuard(): JSX.Element {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!user?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to={user ? getRoleHome(user.role) : '/login'} replace />;
  }

  return <Outlet />;
}
