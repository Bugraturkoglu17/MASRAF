import type { PaginationQuery } from '@masraf/shared-types';
import type { CreateExpenseInput } from '@masraf/shared-validation';
import { Injectable } from '@nestjs/common';

import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception';
import { buildPaginatedResult, toPrismaSkipTake } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async createAndSubmit(organizationId: string, userId: string, input: CreateExpenseInput) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, organizationId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundAppException('Masraf kategorisi');
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          organizationId,
          userId,
          departmentId: input.departmentId,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          currency: input.currency,
          expenseDate: new Date(input.expenseDate),
          documentDate: input.documentDate ? new Date(input.documentDate) : null,
          status: 'PENDING',
          submittedAt: new Date(),
          createdBy: userId,
        },
      });
      await tx.expenseStatusHistory.create({
        data: {
          expenseId: created.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedById: userId,
        },
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

  async listOwn(organizationId: string, userId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { organizationId, userId, deletedAt: null };
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

  async listPendingForOrganization(organizationId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { organizationId, status: 'PENDING' as const, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          category: true,
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(items, totalItems, query);
  }

  async findByIdScoped(id: string, organizationId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: true,
        attachments: true,
        comments: { orderBy: { createdAt: 'asc' } },
        statusHistories: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });
    if (!expense) {
      throw new NotFoundAppException('Masraf');
    }
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
    if (!expense) {
      throw new NotFoundAppException('Masraf');
    }
    if (expense.status !== 'PENDING') {
      throw new ConflictAppException('Yalnızca bekleyen masraflar üzerinde karar verilebilir.');
    }
    return expense;
  }

  assertOwnerOrThrow(expenseUserId: string, requestingUserId: string): void {
    if (expenseUserId !== requestingUserId) {
      throw new ForbiddenAppException();
    }
  }
}
