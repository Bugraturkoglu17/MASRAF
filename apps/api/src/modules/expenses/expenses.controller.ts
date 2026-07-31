import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ForbiddenAppException } from '../../common/exceptions/app.exception';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AttachmentsService } from '../attachments/attachments.service';

import { ExpensesService } from './expenses.service';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD biçiminde olmalıdır.')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Geçerli bir tarih giriniz.');
const expenseDate = isoDate;

const decimalAmount = z
  .union([z.string(), z.number().finite()])
  .transform((value) => String(value))
  .refine(
    (value) => /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value),
    'Tutar en fazla 12 tam ve 2 ondalık basamak içermelidir.',
  )
  .refine((value) => !/^0(?:\.0{1,2})?$/.test(value), 'Tutar pozitif olmalıdır.')
  .transform((value) => {
    const [integer, fraction = ''] = value.split('.');
    return `${integer}.${fraction.padEnd(2, '0')}`;
  });

const ibanSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, '').toUpperCase())
  .refine((s) => /^TR\d{24}$/.test(s), 'IBAN TR ile başlamalı ve 26 karakter olmalıdır.');

const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  amount: decimalAmount,
  currency: z.string().length(3).optional(),
  expenseDate,
  dueDate: isoDate.optional(),
  paymentRecipientType: z.enum(['SELF', 'THIRD_PARTY']).optional(),
  recipientFirstName: z.string().trim().min(1).max(100).nullish(),
  recipientLastName: z.string().trim().min(1).max(100).nullish(),
  recipientIban: ibanSchema.nullish(),
  recipientCompanyName: z.string().trim().max(200).nullish(),
});

const updateExpenseSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  amount: decimalAmount.optional(),
  expenseDate: expenseDate.optional(),
  dueDate: isoDate.optional(),
  paymentRecipientType: z.enum(['SELF', 'THIRD_PARTY']).optional(),
  recipientFirstName: z.string().trim().min(1).max(100).nullish(),
  recipientLastName: z.string().trim().min(1).max(100).nullish(),
  recipientIban: ibanSchema.nullish(),
  recipientCompanyName: z.string().trim().max(200).nullish(),
});

const decisionReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Açıklama zorunludur').max(1000),
});

const statusQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const managerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['due-nearest', 'due-farthest', 'most-overdue', 'newest', 'oldest']).optional(),
});

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

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
    @Query(new ZodValidationPipe(managerQuerySchema)) query: z.infer<typeof managerQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.listPendingForOrganization(user.organizationId, {
      page: query.page ?? 1,
      pageSize: query.limit ?? 50,
      sort: query.sort,
    });
  }

  @Get('manager/due-soon')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listDueSoon(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.listDueSoon(user.organizationId);
  }

  @Get('manager/due-today')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listDueToday(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.listDueToday(user.organizationId);
  }

  @Get('manager/overdue')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async listOverdue(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.listOverdue(user.organizationId);
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

  @Delete('manager/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async deleteByManager(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.expensesService.deleteByManager(id, user.organizationId, user.id);
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

  @Post(':id/payment-receipts')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadPaymentReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı.');
    return this.attachmentsService.uploadPaymentReceipt(user.organizationId, user.id, id, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Get(':id/payment-receipts')
  async listPaymentReceipts(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.listPaymentReceipts(id, user.organizationId, user.id);
  }
}
