import type { PrismaService } from '../../database/prisma.service';

import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('kritik audit yazma hatasını gizlemez', async () => {
    const failure = new Error('database unavailable');
    const prisma = {
      auditLog: { create: jest.fn().mockRejectedValue(failure) },
    } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    await expect(
      service.record({ action: 'UPDATE', resource: 'EXPENSE', resourceId: 'expense-1' }),
    ).rejects.toBe(failure);
  });
});
