import { createHash, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

import type { AccessTokenPayload } from './token.types';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async login(email: string, password: string, ip?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });

    // Kullanıcı bulunamasa bile argon2 doğrulaması benzeri gecikmeyle zamanlama
    // yan kanalı sızdırmamak için sabit bir hash ile karşılaştırma yapılır.
    const passwordHash = user?.passwordHash ?? (await argon2.hash(randomUUID()));
    const passwordValid = await argon2.verify(passwordHash, password).catch(() => false);

    if (!user || !passwordValid || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => `${rp.permission.action}:${rp.permission.resource}`),
        ),
      ),
    ];

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auditLogs.record({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'LOGIN',
      resource: 'USER',
      resourceId: user.id,
      ipAddress: ip,
    });

    return this.issueTokenPair({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roles,
      permissions,
    });
  }

  async refresh(refreshToken: string, ip?: string): Promise<TokenPair> {
    const app = this.configService.get<AppConfig>('app')!;
    let sub: string;
    try {
      const decoded = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: app.jwt.refreshSecret,
      });
      sub = decoded.sub;
    } catch {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş.');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== sub) {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Kullanıcı artık aktif değil.');
    }

    // Refresh token rotasyonu: eski token iptal edilir, yenisi verilir.
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => `${rp.permission.action}:${rp.permission.resource}`),
        ),
      ),
    ];

    const pair = await this.issueTokenPair(
      { sub: user.id, organizationId: user.organizationId, email: user.email, roles, permissions },
      ip,
    );

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: hashToken(pair.refreshToken) },
    });

    return pair;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken
      .updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(payload: AccessTokenPayload, ip?: string): Promise<TokenPair> {
    const app = this.configService.get<AppConfig>('app')!;

    const accessToken = this.jwtService.sign(payload, {
      secret: app.jwt.accessSecret,
      expiresIn: app.jwt.accessExpiresIn,
    });

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, jti },
      { secret: app.jwt.refreshSecret, expiresIn: app.jwt.refreshExpiresIn },
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + this.parseExpiresInSeconds(app.jwt.refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        createdByIp: ip,
      },
    });

    return { accessToken, refreshToken, expiresIn: app.jwt.accessExpiresIn };
  }

  private parseExpiresInSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    const amountText = match?.[1];
    const unit = match?.[2];
    if (!amountText || !unit) return 60 * 60 * 24 * 30;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(amountText) * (multipliers[unit] ?? 86400);
  }
}
