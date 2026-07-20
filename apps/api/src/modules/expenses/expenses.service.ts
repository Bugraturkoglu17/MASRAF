import type { PaginationQuery } from '@masraf/shared-types';
import { Injectable } from '@nestjs/common';

import { ConflictAppException, NotFoundAppException } from '../../common/exceptions/app.exception';
import { buildPaginatedResult, toPrismaSkipTake } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';

export interface CreateExpenseInput {
  categoryId: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  expenseDate: string;
  dueDate?: string;
}

export interface UpdateExpenseInput {
  categoryId?: string;
  title?: string;
  description?: string;
  amount?: number;
  expenseDate?: string;
  dueDate?: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  private async generateExpenseNumber(): Promise<string> {
    const counter = await this.prisma.expenseCounter.update({
      where: { id: 'global' },
      data: { nextVal: { increment: 1 } },
    });
    return String(counter.nextVal);
  }

  async createDraft(organizationId: string, userId: string, input: CreateExpenseInput) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, organizationId, deletedAt: null },
    });
    if (!category) throw new NotFoundAppException('Masraf kategorisi');

    const expenseNumber = await this.generateExpenseNumber();

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          organizationId,
          userId,
          categoryId: input.categoryId,
          expenseNumber,
          title: input.title,
          description: input.description,
          amount: input.amount,
          currency: input.currency ?? 'TRY',
          expenseDate: new Date(input.expenseDate),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: 'DRAFT',
          createdBy: userId,
        },
        include: { category: true },
      });
      await tx.expenseStatusHistory.create({
        data: { expenseId: created.id, fromStatus: null, toStatus: 'DRAFT', changedById: userId },
      });
      return created;
    });

    await this.auditLogs.record({
      organizationId,
      actorId: userId,
      action: 'CREATE',
      resource: 'EXPENSE',
      resourceId: expense.id,
    });

    return expense;
  }

  async updateDraft(id: string, organizationId: string, userId: string, input: UpdateExpenseInput) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, userId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflar düzenlenebilir.');

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.title && { title: input.title }),
        description: input.description,
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.expenseDate && { expenseDate: new Date(input.expenseDate) }),
        dueDate: input.dueDate ? new Date(input.dueDate) : expense.dueDate,
        updatedBy: userId,
      },
      include: { category: true },
    });
  }

  async deleteDraft(id: string, organizationId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, userId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflar silinebilir.');

    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async submitDraft(id: string, organizationId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, userId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflar onaya gönderilebilir.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.expense.update({
        where: { id },
        data: { status: 'PENDING', submittedAt: new Date(), updatedBy: userId },
        include: { category: true, user: { select: { firstName: true, lastName: true } } },
      });
      await tx.expenseStatusHistory.create({
        data: { expenseId: id, fromStatus: 'DRAFT', toStatus: 'PENDING', changedById: userId },
      });
      return result;
    });

    this.realtime.emit({
      type: 'EXPENSE_SUBMITTED',
      organizationId,
      payload: {
        expenseId: updated.id,
        expenseNumber: updated.expenseNumber,
        title: updated.title,
        amount: updated.amount.toString(),
        userName: `${updated.user.firstName} ${updated.user.lastName}`,
        submittedAt: updated.submittedAt?.toISOString(),
      },
    });

    return updated;
  }

  async listOwn(
    organizationId: string,
    userId: string,
    query: PaginationQuery & { status?: string },
  ) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = {
      organizationId,
      userId,
      deletedAt: null as null,
      ...(query.status
        ? { status: query.status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(items, totalItems, query);
  }

  async listOwnCounts(organizationId: string, userId: string) {
    const [draft, pending, approved, rejected] = await Promise.all([
      this.prisma.expense.count({
        where: { organizationId, userId, status: 'DRAFT', deletedAt: null },
      }),
      this.prisma.expense.count({
        where: { organizationId, userId, status: 'PENDING', deletedAt: null },
      }),
      this.prisma.expense.count({
        where: { organizationId, userId, status: 'APPROVED', deletedAt: null },
      }),
      this.prisma.expense.count({
        where: { organizationId, userId, status: 'REJECTED', deletedAt: null },
      }),
    ]);
    return { draft, pending, approved, rejected };
  }

  async listPendingForOrganization(organizationId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { organizationId, status: 'PENDING' as const, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { submittedAt: 'asc' },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              iban: true,
            },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(items, totalItems, query);
  }

  async listForOrganizationByStatus(
    organizationId: string,
    status: 'APPROVED' | 'REJECTED',
    query: PaginationQuery,
  ) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { organizationId, status, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { decidedAt: 'desc' },
        include: {
          category: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(items, totalItems, query);
  }

  async managerCounts(organizationId: string) {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.expense.count({ where: { organizationId, status: 'PENDING', deletedAt: null } }),
      this.prisma.expense.count({ where: { organizationId, status: 'APPROVED', deletedAt: null } }),
      this.prisma.expense.count({ where: { organizationId, status: 'REJECTED', deletedAt: null } }),
    ]);
    return { pending, approved, rejected };
  }

  async findByIdScoped(id: string, organizationId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: true,
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        statusHistories: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            iban: true,
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    return expense;
  }

  async approve(id: string, organizationId: string, approverId: string) {
    const expense = await this.assertPending(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expense.id },
        data: { status: 'APPROVED', decidedAt: new Date(), updatedBy: approverId },
      });
      await tx.expenseStatusHistory.create({
        data: {
          expenseId: expense.id,
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          changedById: approverId,
        },
      });
      await tx.approval.create({
        data: { expenseId: expense.id, approverId, decision: 'APPROVED', decidedAt: new Date() },
      });
    });

    await this.auditLogs.record({
      organizationId,
      actorId: approverId,
      action: 'APPROVE',
      resource: 'EXPENSE',
      resourceId: expense.id,
    });
    await this.notifications.create(
      organizationId,
      expense.userId,
      'Masrafınız onaylandı',
      `${expense.title} başlıklı masrafınız onaylandı.`,
    );

    return this.findByIdScoped(id, organizationId);
  }

  async reject(id: string, organizationId: string, approverId: string, reason: string) {
    const expense = await this.assertPending(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          rejectionReason: reason,
          updatedBy: approverId,
        },
      });
      await tx.expenseStatusHistory.create({
        data: {
          expenseId: expense.id,
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          changedById: approverId,
          reason,
        },
      });
      await tx.approval.create({
        data: {
          expenseId: expense.id,
          approverId,
          decision: 'REJECTED',
          comment: reason,
          decidedAt: new Date(),
        },
      });
    });

    await this.auditLogs.record({
      organizationId,
      actorId: approverId,
      action: 'REJECT',
      resource: 'EXPENSE',
      resourceId: expense.id,
      metadata: { reason },
    });
    await this.notifications.create(
      organizationId,
      expense.userId,
      'Masrafınız reddedildi',
      `${expense.title} başlıklı masrafınız reddedildi: ${reason}`,
    );

    return this.findByIdScoped(id, organizationId);
  }

  private async assertPending(id: string, organizationId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'PENDING')
      throw new ConflictAppException('Yalnızca bekleyen masraflar üzerinde karar verilebilir.');
    return expense;
  }
}
