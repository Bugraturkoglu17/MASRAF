import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AppRole } from '../../modules/auth/token.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    }
    return true;
  }
}
