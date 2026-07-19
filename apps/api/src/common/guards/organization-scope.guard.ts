import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ForbiddenAppException } from '../exceptions/app.exception';

/**
 * URL parametresi olarak gelen :organizationId, giriş yapan kullanıcının
 * kendi organizationId'si ile eşleşmiyorsa isteği reddeder. Organizasyon
 * kapsamlı endpoint'lerde JwtAuthGuard'dan sonra kullanılır.
 */
@Injectable()
export class OrganizationScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const paramOrgId = request.params?.organizationId;

    if (!user) {
      throw new ForbiddenAppException('Kimlik doğrulaması gereklidir.');
    }
    if (paramOrgId && paramOrgId !== user.organizationId) {
      throw new ForbiddenAppException('Bu organizasyonun verilerine erişim yetkiniz yok.');
    }
    return true;
  }
}
