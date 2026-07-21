import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const app = this.configService.get<AppConfig>('app')!;
    if (!app.maintenance.mode) return true;

    const request = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      user?: AuthenticatedUser;
    }>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (request.path.includes('/auth/')) return true;
    if (request.user?.role === 'ADMIN') return true;

    throw new AppException('MAINTENANCE_MODE', app.maintenance.message, 503);
  }
}
