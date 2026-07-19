import {
  createExpenseSchema,
  rejectExpenseSchema,
  type CreateExpenseInput,
  type RejectExpenseInput,
} from '@masraf/shared-validation';
import { paginationQuerySchema, type PaginationQueryInput } from '@masraf/shared-validation';
import { Body, Controller, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermissions({ action: PermissionAction.CREATE, resource: PermissionResource.EXPENSE })
  @UsePipes(new ZodValidationPipe(createExpenseSchema))
  async create(@Body() body: CreateExpenseInput, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.createAndSubmit(user.organizationId, user.id, body);
  }

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.EXPENSE })
  async listOwn(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listOwn(user.organizationId, user.id, query);
  }

  @Get('pending')
  @RequirePermissions({ action: PermissionAction.APPROVE, resource: PermissionResource.EXPENSE })
  async listPending(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listPendingForOrganization(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.EXPENSE })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.findByIdScoped(id, user.organizationId);
  }

  @Post(':id/approve')
  @RequirePermissions({ action: PermissionAction.APPROVE, resource: PermissionResource.EXPENSE })
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.approve(id, user.organizationId, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions({ action: PermissionAction.REJECT, resource: PermissionResource.EXPENSE })
  @UsePipes(new ZodValidationPipe(rejectExpenseSchema))
  async reject(
    @Param('id') id: string,
    @Body() body: RejectExpenseInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.reject(id, user.organizationId, user.id, body.reason);
  }
}
