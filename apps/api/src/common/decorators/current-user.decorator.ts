import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AppRole } from '../../modules/auth/token.types';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: AppRole;
  roles: string[];
  permissions: string[];
  profileCompleted: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
