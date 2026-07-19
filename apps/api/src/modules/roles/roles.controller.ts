import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

import type { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.ROLE })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.listByOrganization(user.organizationId);
  }
}
