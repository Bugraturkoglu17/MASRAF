import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionAction, PermissionResource } from '@prisma/client';

import { ForbiddenAppException } from '../exceptions/app.exception';

import { PermissionsGuard } from './permissions.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('gerekli izin tanımlanmamışsa erişime izin verir', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('kullanıcı gerekli izne sahipse erişime izin verir', () => {
    const reflector = {
      getAllAndOverride: () => [
        { action: PermissionAction.READ, resource: PermissionResource.EXPENSE },
      ],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const user = { permissions: ['READ:EXPENSE'] };
    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('kullanıcı gerekli izne sahip değilse ForbiddenAppException fırlatır', () => {
    const reflector = {
      getAllAndOverride: () => [
        { action: PermissionAction.APPROVE, resource: PermissionResource.EXPENSE },
      ],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const user = { permissions: ['READ:EXPENSE'] };
    expect(() => guard.canActivate(buildContext(user))).toThrow(ForbiddenAppException);
  });

  it('kullanıcı yoksa ForbiddenAppException fırlatır', () => {
    const reflector = {
      getAllAndOverride: () => [
        { action: PermissionAction.READ, resource: PermissionResource.EXPENSE },
      ],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenAppException);
  });
});
