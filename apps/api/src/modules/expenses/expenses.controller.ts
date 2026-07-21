import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ForbiddenAppException } from '../../common/exceptions/app.exception';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { ExpensesService } from './expenses.service';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD biçiminde olmalıdır.')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Geçerli bir tarih giriniz.');
const expenseDate = isoDate.refine(
  (value) =>
    value <= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()),
  'Masraf tarihi gelecekte olamaz.',
);

const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  amount: z.number().finite().positive().max(999_999_999_999.99),
  currency: z.string().length(3).optional(),
  expenseDate,
  dueDate: isoDate.optional(),
});

const updateExpenseSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  amount: z.number().finite().positive().max(999_999_999_999.99).optional(),
  expenseDate: expenseDate.optional(),
  dueDate: isoDate.optional(),
});

const decisionReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Açıklama zorunludur').max(1000),
});

const statusQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ── USER endpoints ─────────────────────────────────────────────────────────

  @Post()
  async create(
    @Body(new ZodValidationPipe(createExpenseSchema)) body: z.infer<typeof createExpenseSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.profileCompleted) {
      throw new ForbiddenAppException('Masraf oluşturmadan önce profilinizi tamamlayın.');
    }
    return this.expensesService.createDraft(user.organizationId, user.id, body);
  }

  @Get()
  async listOwn(
    @Query(new ZodValidationPipe(statusQuerySchema)) query: z.infer<typeof statusQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listOwn(user.organizationId, user.id, {
      page: query.page ?? 1,
      pageSize: query.limit ?? 20,
      status: query.status,
    });
  }

  @Get('counts')
  async counts(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.listOwnCounts(user.organizationId, user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.findByIdForActor(
      id,
      user.organizationId,
      user.id,
      user.role,
      user.permissions.includes('READ:USER'),
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) body: z.infer<typeof updateExpenseSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.updateDraft(id, user.organizationId, user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.expensesService.deleteDraft(id, user.organizationId, user.id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.submitDraft(id, user.organizationId, user.id);
  }

  // ── MANAGER endpoints ──────────────────────────────────────────────────────

  @Get('manager/pending')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listPending(
    @Query(new ZodValidationPipe(statusQuerySchema)) query: z.infer<typeof statusQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listPendingForOrganization(user.organizationId, {
      page: query.page ?? 1,
      pageSize: query.limit ?? 20,
    });
  }

  @Get('manager/counts')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async managerCounts(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.managerCounts(user.organizationId);
  }

  @Get('manager/approved')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listApproved(
    @Query(new ZodValidationPipe(statusQuerySchema)) query: z.infer<typeof statusQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listForOrganizationByStatus(user.organizationId, 'APPROVED', {
      page: query.page ?? 1,
      pageSize: query.limit ?? 20,
    });
  }

  @Get('manager/rejected')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listRejected(
    @Query(new ZodValidationPipe(statusQuerySchema)) query: z.infer<typeof statusQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listForOrganizationByStatus(user.organizationId, 'REJECTED', {
      page: query.page ?? 1,
      pageSize: query.limit ?? 20,
    });
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.approve(id, user.organizationId, user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decisionReasonSchema))
    body: z.infer<typeof decisionReasonSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.reject(id, user.organizationId, user.id, body.reason);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decisionReasonSchema))
    body: z.infer<typeof decisionReasonSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.cancel(id, user.organizationId, user.id, user.role, body.reason);
  }
}
