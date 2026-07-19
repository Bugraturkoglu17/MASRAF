import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

import { RequirePermissions } from '../../common/decorators/permissions.decorator';

import type { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.ROLE })
  async list() {
    return this.permissionsService.listAll();
  }
}
