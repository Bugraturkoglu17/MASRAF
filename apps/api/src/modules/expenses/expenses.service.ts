import type { PaginationQuery } from '@masraf/shared-types';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

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

  private async generateExpenseNumber(client: Pick<Prisma.TransactionClient, 'expenseCounter'>) {
    const counter = await client.expenseCounter.update({
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
    if (category.requiresDueDate && !input.dueDate) {
      throw new ConflictAppException('Bu kategori için vade tarihi zorunludur.');
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const expenseNumber = await this.generateExpenseNumber(tx);
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
        include: {
          category: true,
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          },
        },
      });
      await tx.expenseStatusHistory.create({
        data: { expenseId: created.id, fromStatus: null, toStatus: 'DRAFT', changedById: userId },
      });
      await this.auditLogs.record(
        {
          organizationId,
          actorId: userId,
          action: 'CREATE',
          resource: 'EXPENSE',
          resourceId: created.id,
        },
        tx,
      );
      return created;
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

    if (input.categoryId || input.dueDate === undefined) {
      const categoryId = input.categoryId ?? expense.categoryId;
      const category = await this.prisma.expenseCategory.findFirst({
        where: { id: categoryId, organizationId, deletedAt: null },
      });
      if (!category) throw new NotFoundAppException('Masraf kategorisi');
      if (category.requiresDueDate && !(input.dueDate ?? expense.dueDate)) {
        throw new ConflictAppException('Bu kategori için vade tarihi zorunludur.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
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
        include: {
          category: true,
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          },
        },
      });
      await this.auditLogs.record(
        { organizationId, actorId: userId, action: 'UPDATE', resource: 'EXPENSE', resourceId: id },
        tx,
      );
      return updated;
    });
  }

  async deleteDraft(id: string, organizationId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, userId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflar silinebilir.');

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.auditLogs.record(
        { organizationId, actorId: userId, action: 'DELETE', resource: 'EXPENSE', resourceId: id },
        tx,
      );
    });
  }

  async submitDraft(id: string, organizationId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, userId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflar onaya gönderilebilir.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.expense.updateMany({
        where: { id, organizationId, userId, status: 'DRAFT', deletedAt: null },
        data: { status: 'PENDING', submittedAt: new Date(), updatedBy: userId },
      });
      if (claimed.count !== 1) {
        throw new ConflictAppException('Masraf başka bir işlem tarafından güncellendi.');
      }
      await tx.expenseStatusHistory.create({
        data: { expenseId: id, fromStatus: 'DRAFT', toStatus: 'PENDING', changedById: userId },
      });
      await this.auditLogs.record(
        {
          organizationId,
          actorId: userId,
          action: 'UPDATE',
          resource: 'EXPENSE',
          resourceId: id,
          metadata: { transition: 'DRAFT->PENDING' },
        },
        tx,
      );
      const result = await tx.expense.findUniqueOrThrow({
        where: { id },
        include: { category: true, user: { select: { firstName: true, lastName: true } } },
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
        ? { status: query.status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          },
        },
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
              email: true,
            },
          },
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
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
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          },
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
            organization: { select: { name: true } },
            department: { select: { name: true } },
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

  async findByIdForActor(
    id: string,
    organizationId: string,
    actorId: string,
    actorRole: 'USER' | 'MANAGER' | 'ADMIN',
    canReadSensitiveUserData = false,
  ) {
    const expense = await this.findByIdScoped(id, organizationId);
    if (actorRole === 'USER' && expense.userId !== actorId) {
      // Kaydın varlığını sızdırmamak için 404 döndürülür.
      throw new NotFoundAppException('Masraf');
    }
    if ((actorRole === 'MANAGER' || actorRole === 'ADMIN') && canReadSensitiveUserData) {
      return expense;
    }

    if (!expense.user) return expense;

    const { phone: _phone, iban: _iban, ...safeUser } = expense.user;
    return { ...expense, user: safeUser };
  }

  async approve(id: string, organizationId: string, approverId: string) {
    const expense = await this.assertPending(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.expense.updateMany({
        where: { id: expense.id, organizationId, status: 'PENDING', deletedAt: null },
        data: { status: 'APPROVED', decidedAt: new Date(), updatedBy: approverId },
      });
      if (claimed.count !== 1) {
        throw new ConflictAppException('Masraf başka bir işlem tarafından güncellendi.');
      }
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
      await this.auditLogs.record(
        {
          organizationId,
          actorId: approverId,
          action: 'APPROVE',
          resource: 'EXPENSE',
          resourceId: expense.id,
        },
        tx,
      );
      await this.notifications.create(
        organizationId,
        expense.userId,
        'Masrafınız onaylandı',
        `${expense.title} başlıklı masrafınız onaylandı.`,
        'IN_APP',
        tx,
      );
    });
    this.realtime.emit({
      type: 'EXPENSE_APPROVED',
      organizationId,
      payload: { expenseId: expense.id, expenseNumber: expense.expenseNumber },
    });

    return this.findByIdScoped(id, organizationId);
  }

  async reject(id: string, organizationId: string, approverId: string, reason: string) {
    const expense = await this.assertPending(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.expense.updateMany({
        where: { id: expense.id, organizationId, status: 'PENDING', deletedAt: null },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          rejectionReason: reason,
          updatedBy: approverId,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictAppException('Masraf başka bir işlem tarafından güncellendi.');
      }
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
      await this.auditLogs.record(
        {
          organizationId,
          actorId: approverId,
          action: 'REJECT',
          resource: 'EXPENSE',
          resourceId: expense.id,
          metadata: { reason },
        },
        tx,
      );
      await this.notifications.create(
        organizationId,
        expense.userId,
        'Masrafınız reddedildi',
        `${expense.title} başlıklı masrafınız reddedildi: ${reason}`,
        'IN_APP',
        tx,
      );
    });
    this.realtime.emit({
      type: 'EXPENSE_REJECTED',
      organizationId,
      payload: { expenseId: expense.id, expenseNumber: expense.expenseNumber, reason },
    });

    return this.findByIdScoped(id, organizationId);
  }

  async cancel(
    id: string,
    organizationId: string,
    actorId: string,
    actorRole: 'USER' | 'MANAGER' | 'ADMIN',
    reason: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    const isOwner = expense.userId === actorId;
    const isManager = actorRole === 'MANAGER' || actorRole === 'ADMIN';
    if (!isOwner && !isManager) throw new NotFoundAppException('Masraf');
    if (!['DRAFT', 'PENDING'].includes(expense.status)) {
      throw new ConflictAppException('Yalnızca taslak veya bekleyen masraflar iptal edilebilir.');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.expense.updateMany({
        where: {
          id,
          organizationId,
          status: { in: ['DRAFT', 'PENDING'] },
          deletedAt: null,
        },
        data: {
          status: 'CANCELLED',
          rejectionReason: reason,
          decidedAt: new Date(),
          updatedBy: actorId,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictAppException('Masraf başka bir işlem tarafından güncellendi.');
      }
      await tx.expenseStatusHistory.create({
        data: {
          expenseId: id,
          fromStatus: expense.status,
          toStatus: 'CANCELLED',
          changedById: actorId,
          reason,
        },
      });
      await this.auditLogs.record(
        {
          organizationId,
          actorId,
          action: 'UPDATE',
          resource: 'EXPENSE',
          resourceId: id,
          metadata: { transition: `${expense.status}->CANCELLED`, reason },
        },
        tx,
      );
      if (!isOwner) {
        await this.notifications.create(
          organizationId,
          expense.userId,
          'Masrafınız iptal edildi',
          `${expense.title} başlıklı masrafınız iptal edildi: ${reason}`,
          'IN_APP',
          tx,
        );
      }
    });
    this.realtime.emit({
      type: 'EXPENSE_CANCELLED',
      organizationId,
      payload: { expenseId: id, expenseNumber: expense.expenseNumber, reason },
    });
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
