import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

import type { AdminCreateUserDto, AdminUpdateUserDto } from './users.service';
import { UsersService } from './users.service';

const completeProfileSchema = z.object({
  firstName: z.string().trim().min(2, 'Ad zorunludur').max(80),
  lastName: z.string().trim().min(2, 'Soyad zorunludur').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+90|0)?5\d{9}$/, 'Geçerli bir Türkiye cep telefonu giriniz.'),
  iban: z
    .string()
    .transform((value) => value.replace(/\s/g, '').toUpperCase())
    .pipe(z.string().regex(/^TR\d{24}$/, 'Geçerli bir Türkiye IBAN numarası giriniz.')),
});

const setRoleSchema = z.object({
  role: z.nativeEnum(AppRole),
});

const setStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

const changeOwnPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.').max(72),
  newPasswordConfirm: z.string(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.').max(72),
  newPasswordConfirm: z.string(),
});

const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().min(10, 'Telefon numarası zorunludur.').max(20),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  roleName: z.enum(['USER', 'MANAGER']),
  tempPassword: z.string().min(8, 'Geçici şifre en az 8 karakter olmalıdır.').max(72),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  iban: z.string().max(34).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  jobTitle: z.string().max(100).nullable().optional(),
});

const listUsersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  role: z.nativeEnum(AppRole).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  profileCompleted: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  mustChangePassword: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
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

  @Patch('me/password')
  async changeOwnPassword(
    @Body(new ZodValidationPipe(changeOwnPasswordSchema))
    body: z.infer<typeof changeOwnPasswordSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.changeOwnPassword(
      user.id,
      user.organizationId,
      body.newPassword,
      body.newPasswordConfirm,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: z.infer<typeof listUsersQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.listByOrganization(user.organizationId, query);
  }

  @Get('admin-stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async adminStats(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAdminStats(user.organizationId);
  }

  @Get('system-overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async systemOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getSystemOverview(user.organizationId);
  }

  @Get('manager-account')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async managerAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getManagerAccount(user.organizationId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: AdminCreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createUser(user.organizationId, body, user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdInOrganization(id, user.organizationId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: AdminUpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateUserByAdmin(id, user.organizationId, body, user.id);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async setRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRoleSchema)) body: z.infer<typeof setRoleSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setRole(id, user.organizationId, body.role, user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setStatusSchema)) body: z.infer<typeof setStatusSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setStatus(id, user.organizationId, body.status, user.id);
  }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async resetPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: z.infer<typeof resetPasswordSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(
      id,
      user.organizationId,
      body.newPassword,
      body.newPasswordConfirm,
      user.id,
    );
  }

  @Post(':id/revoke-sessions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async revokeSessions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.revokeSessions(id, user.organizationId, user.id);
  }

  @Get(':id/audit-logs')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async userAuditLogs(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(pageQuerySchema)) query: z.infer<typeof pageQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getUserAuditLogs(id, user.organizationId, query);
  }
}
