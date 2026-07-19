import type { ReactNode } from 'react';

/**
 * Backend ile aynı `ACTION:RESOURCE` sözleşimini paylaşır (bkz.
 * apps/api PermissionsGuard). Kullanıcının izin listesi login sonrası
 * genişletilecek AuthContext üzerinden sağlanacaktır; şimdilik prop olarak
 * alınır ki bileşen bağımsız test edilebilsin.
 */
export function PermissionGate({
  permissions,
  required,
  fallback = null,
  children,
}: {
  permissions: string[];
  required: string[];
  fallback?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const hasAccess = required.every((perm) => permissions.includes(perm));
  return <>{hasAccess ? children : fallback}</>;
}
