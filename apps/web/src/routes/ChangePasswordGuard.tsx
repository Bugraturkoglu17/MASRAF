import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';

/** Geçici şifre kullanan kullanıcıyı zorunlu şifre değiştirme ekranına yönlendirir. */
export function ChangePasswordGuard(): JSX.Element {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
