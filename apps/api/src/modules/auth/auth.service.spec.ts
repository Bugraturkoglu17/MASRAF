import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { PrismaService } from '../../database/prisma.service';
import type { AuditLogsService } from '../audit-logs/audit-logs.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: JwtService;
  let configService: ConfigService;
  let auditLogs: AuditLogsService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    } as unknown as JwtService;
    configService = {
      get: jest.fn().mockReturnValue({
        jwt: {
          accessSecret: 'a'.repeat(32),
          refreshSecret: 'b'.repeat(32),
          accessExpiresIn: '15m',
          refreshExpiresIn: '30d',
        },
      }),
    } as unknown as ConfigService;
    auditLogs = { record: jest.fn() } as unknown as AuditLogsService;

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService,
      configService,
      auditLogs,
    );
  });

  it('geçersiz e-posta ile UnauthorizedException fırlatır', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.login('yok@example.com', 'sifre12345')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('doğru şifre ile giriş yapıldığında token çifti döner', async () => {
    const passwordHash = await argon2.hash('DogruSifre123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
      email: 'kullanici@example.com',
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
      userRoles: [],
    });

    const result = await authService.login('kullanici@example.com', 'DogruSifre123');

    expect(result.accessToken).toBe('signed-token');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', resource: 'USER' }),
    );
  });

  it('yanlış şifre ile UnauthorizedException fırlatır', async () => {
    const passwordHash = await argon2.hash('DogruSifre123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
      email: 'kullanici@example.com',
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
      userRoles: [],
    });

    await expect(authService.login('kullanici@example.com', 'YanlisSifre')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('aktif olmayan kullanıcı ile UnauthorizedException fırlatır', async () => {
    const passwordHash = await argon2.hash('DogruSifre123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
      email: 'kullanici@example.com',
      passwordHash,
      status: 'SUSPENDED',
      deletedAt: null,
      userRoles: [],
    });

    await expect(authService.login('kullanici@example.com', 'DogruSifre123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('iptal edilmiş refresh token tekrar kullanılırsa tüm oturumları iptal eder', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(authService.refresh('replayed-token')).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
  });
});
