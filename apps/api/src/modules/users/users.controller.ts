import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { z } from 'zod';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { UsersService } from './users.service';

const completeProfileSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  phone: z.string().min(1, 'Telefon zorunludur'),
  iban: z.string().min(1, 'IBAN zorunludur'),
});

const setRoleSchema = z.object({
  role: z.nativeEnum(AppRole),
});

const setStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me/profile')
  async completeProfile(
    @Body(new ZodValidationPipe(completeProfileSchema)) body: z.infer<typeof completeProfileSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.completeProfile(user.id, body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listByOrganization(user.organizationId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdInOrganization(id, user.organizationId);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async setRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRoleSchema)) body: z.infer<typeof setRoleSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setRole(id, user.organizationId, body.role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setStatusSchema)) body: z.infer<typeof setStatusSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setStatus(id, user.organizationId, body.status);
  }
}
