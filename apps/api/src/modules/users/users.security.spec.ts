import { ConflictAppException, ForbiddenAppException } from '../../common/exceptions/app.exception';
import type { PrismaService } from '../../database/prisma.service';
import type { AuditLogsService } from '../audit-logs/audit-logs.service';

import { UsersService } from './users.service';

describe('UsersService admin safeguards', () => {
  const audit = { record: jest.fn() } as unknown as AuditLogsService;
  const admin = {
    id: 'admin-1',
    organizationId: 'org-1',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  it('admin kendi ADMIN rolünü kaldıramaz', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(admin) },
    } as unknown as PrismaService;
    const service = new UsersService(prisma, audit);

    await expect(service.setRole('admin-1', 'org-1', 'USER', 'admin-1')).rejects.toBeInstanceOf(
      ForbiddenAppException,
    );
  });

  it('son aktif ADMIN pasif yapılamaz', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ ...admin, id: 'admin-2' }),
        count: jest.fn().mockResolvedValue(1),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma, audit);

    await expect(
      service.setStatus('admin-2', 'org-1', 'INACTIVE', 'admin-1'),
    ).rejects.toBeInstanceOf(ConflictAppException);
  });
});
