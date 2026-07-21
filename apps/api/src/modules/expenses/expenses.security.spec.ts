import { ConflictAppException, NotFoundAppException } from '../../common/exceptions/app.exception';
import type { PrismaService } from '../../database/prisma.service';
import type { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { RealtimeService } from '../realtime/realtime.service';

import { ExpensesService } from './expenses.service';

describe('ExpensesService security invariants', () => {
  const audit = { record: jest.fn() } as unknown as AuditLogsService;
  const notifications = { create: jest.fn() } as unknown as NotificationsService;
  const realtime = { emit: jest.fn() } as unknown as RealtimeService;

  beforeEach(() => jest.clearAllMocks());

  it('USER aynı organizasyondaki başka kullanıcı masrafını okuyamaz', async () => {
    const prisma = {
      expense: { findFirst: jest.fn().mockResolvedValue({ id: 'expense-1', userId: 'owner-1' }) },
    } as unknown as PrismaService;
    const service = new ExpensesService(prisma, audit, notifications, realtime);

    await expect(
      service.findByIdForActor('expense-1', 'org-1', 'user-2', 'USER'),
    ).rejects.toBeInstanceOf(NotFoundAppException);
  });

  it('MANAGER kendi organizasyonundaki masrafı okuyabilir', async () => {
    const expense = { id: 'expense-1', userId: 'owner-1' };
    const prisma = {
      expense: { findFirst: jest.fn().mockResolvedValue(expense) },
    } as unknown as PrismaService;
    const service = new ExpensesService(prisma, audit, notifications, realtime);

    await expect(
      service.findByIdForActor('expense-1', 'org-1', 'manager-1', 'MANAGER'),
    ).resolves.toBe(expense);
  });

  it('yetkisiz yönetici detayında telefon ve IBAN alanlarını döndürmez', async () => {
    const prisma = {
      expense: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'expense-1',
          userId: 'owner-1',
          user: {
            id: 'owner-1',
            firstName: 'Ayşe',
            lastName: 'Yılmaz',
            email: 'ayse@example.com',
            phone: '+905001112233',
            iban: 'TR0001',
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new ExpensesService(prisma, audit, notifications, realtime);

    const result = await service.findByIdForActor('expense-1', 'org-1', 'manager-1', 'MANAGER');
    expect(result.user).toEqual(expect.objectContaining({ email: 'ayse@example.com' }));
    expect(result.user).not.toHaveProperty('phone');
    expect(result.user).not.toHaveProperty('iban');
  });

  it('eşzamanlı ikinci onay durum güncellemesini gerçekleştiremez', async () => {
    const tx = {
      expense: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      expenseStatusHistory: { create: jest.fn() },
      approval: { create: jest.fn() },
    };
    const prisma = {
      expense: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'expense-1',
          organizationId: 'org-1',
          userId: 'user-1',
          status: 'PENDING',
        }),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;
    const service = new ExpensesService(prisma, audit, notifications, realtime);

    await expect(service.approve('expense-1', 'org-1', 'manager-1')).rejects.toBeInstanceOf(
      ConflictAppException,
    );
    expect(tx.approval.create).not.toHaveBeenCalled();
  });

  it('onay, audit ve bildirimi aynı transaction içinde kaydeder', async () => {
    const expense = {
      id: 'expense-1',
      organizationId: 'org-1',
      userId: 'user-1',
      status: 'PENDING',
      title: 'Konaklama',
      expenseNumber: '1001',
    };
    const tx = {
      expense: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      expenseStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      approval: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const prisma = {
      expense: { findFirst: jest.fn().mockResolvedValue(expense) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;
    const service = new ExpensesService(prisma, audit, notifications, realtime);

    await service.approve('expense-1', 'org-1', 'manager-1');

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVE' }), tx);
    expect(notifications.create).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.any(String),
      expect.any(String),
      'IN_APP',
      tx,
    );
  });
});
