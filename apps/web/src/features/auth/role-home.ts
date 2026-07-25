import type { AppRole } from './auth-context';

export function getRoleHome(role: AppRole): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'MANAGER') return '/manager';
  return '/';
}

export function getPostLoginPath(role: AppRole, requestedPath?: string): string {
  if (!requestedPath) return getRoleHome(role);

  if (role === 'ADMIN' && requestedPath.startsWith('/admin')) return requestedPath;
  if (role === 'MANAGER' && requestedPath.startsWith('/manager')) return requestedPath;
  if (
    role === 'USER' &&
    !requestedPath.startsWith('/admin') &&
    !requestedPath.startsWith('/manager')
  ) {
    return requestedPath;
  }

  return getRoleHome(role);
}
