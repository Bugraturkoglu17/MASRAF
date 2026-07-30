import * as argon2 from 'argon2';

import {
  ConflictAppException,
  ForbiddenAppException,
  ValidationAppException,
} from '../../common/exceptions/app.exception';
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
      service.setStatus('admin-2', 'org-1', 'INACTIVE', 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(ConflictAppException);
  });
});

describe('UsersService.changeOwnPassword', () => {
  const audit = { record: jest.fn() } as unknown as AuditLogsService;

  function buildPrisma(passwordHash: string, mustChangePassword: boolean) {
    const tx = {
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ passwordHash, mustChangePassword }) },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
    return prisma;
  }

  // İlk girişte zorunlu şifre belirleme: mevcut (geçici) şifre zaten
  // /auth/login sırasında doğrulanmıştır, tekrar istenmez.
  it('mustChangePassword true iken currentPassword gönderilmeden çalışır', async () => {
    const tempHash = await argon2.hash('GeciciSifre1!');
    const service = new UsersService(buildPrisma(tempHash, true), audit);

    await expect(
      service.changeOwnPassword('user-1', 'org-1', undefined, 'YeniSifre2@', 'YeniSifre2@'),
    ).resolves.toMatchObject({ message: expect.any(String) });
  });

  // Gönüllü (ayarlardan) şifre değişikliğinde mevcut şifre her zaman zorunludur.
  it('mustChangePassword false iken currentPassword zorunludur', async () => {
    const currentHash = await argon2.hash('MevcutSifre1!');
    const service = new UsersService(buildPrisma(currentHash, false), audit);

    await expect(
      service.changeOwnPassword('user-1', 'org-1', undefined, 'YeniSifre2@', 'YeniSifre2@'),
    ).rejects.toBeInstanceOf(ValidationAppException);
  });

  it('mustChangePassword false iken yanlış currentPassword reddedilir', async () => {
    const currentHash = await argon2.hash('MevcutSifre1!');
    const service = new UsersService(buildPrisma(currentHash, false), audit);

    await expect(
      service.changeOwnPassword('user-1', 'org-1', 'YanlisSifre!', 'YeniSifre2@', 'YeniSifre2@'),
    ).rejects.toBeInstanceOf(ValidationAppException);
  });

  it('mustChangePassword false iken doğru currentPassword ile çalışır', async () => {
    const currentHash = await argon2.hash('MevcutSifre1!');
    const service = new UsersService(buildPrisma(currentHash, false), audit);

    await expect(
      service.changeOwnPassword('user-1', 'org-1', 'MevcutSifre1!', 'YeniSifre2@', 'YeniSifre2@'),
    ).resolves.toMatchObject({ message: expect.any(String) });
  });
});
