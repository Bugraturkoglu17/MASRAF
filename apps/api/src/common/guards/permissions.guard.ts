import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY, type RequiredPermission } from '../decorators/permissions.decorator';
import { ForbiddenAppException } from '../exceptions/app.exception';

/**
 * JwtAuthGuard'dan SONRA çalışmalıdır (request.user'ın dolu olmasına bağımlıdır).
 * Kullanıcının rollerinden türetilmiş izin listesi ile route'un istediği
 * izinleri karşılaştırır.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenAppException('Kimlik doğrulaması gereklidir.');
    }

    const hasAll = required.every((perm) =>
      user.permissions.includes(`${perm.action}:${perm.resource}`),
    );
    if (!hasAll) {
      throw new ForbiddenAppException();
    }
    return true;
  }
}
