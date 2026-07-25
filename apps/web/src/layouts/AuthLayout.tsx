import { Outlet } from 'react-router-dom';

export function AuthLayout(): JSX.Element {
  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}
