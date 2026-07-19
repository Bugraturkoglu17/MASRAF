import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdInOrganization(user.id, user.organizationId);
  }

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.USER })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listByOrganization(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.USER })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdInOrganization(id, user.organizationId);
  }
}
