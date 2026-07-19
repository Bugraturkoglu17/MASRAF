import { SetMetadata } from '@nestjs/common';
import type { PermissionAction, PermissionResource } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: PermissionAction;
  resource: PermissionResource;
}

/** Route'un gerektirdiği izinleri bildirir; PermissionsGuard tarafından okunur. */
export const RequirePermissions = (...permissions: RequiredPermission[]): MethodDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
