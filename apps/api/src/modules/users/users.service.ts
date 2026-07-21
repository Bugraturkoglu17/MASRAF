import { Injectable } from '@nestjs/common';
import type { AppRole } from '@prisma/client';

import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface CompleteProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
  iban: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  organizationId: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getMe(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        iban: true,
        role: true,
        profileCompleted: true,
        status: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
    });
    if (!user) throw new NotFoundAppException('Kullanıcı');
    return user;
  }

  async completeProfile(id: string, input: CompleteProfileInput) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          iban: input.iban,
          profileCompleted: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          iban: true,
          role: true,
          profileCompleted: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      });
      await this.auditLogs.record(
        {
          organizationId: updated.organizationId,
          actorId: id,
          action: 'UPDATE',
          resource: 'USER_PROFILE',
          resourceId: id,
        },
        tx,
      );
      return updated;
    });
  }

  async findByIdInOrganization(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        iban: true,
        role: true,
        profileCompleted: true,
        status: true,
        departmentId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundAppException('Kullanıcı');
    return user;
  }

  async listByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        profileCompleted: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(
    id: string,
    organizationId: string,
    status: 'ACTIVE' | 'INACTIVE',
    actorId: string,
  ) {
    const target = await this.findByIdInOrganization(id, organizationId);
    if (target.role === 'ADMIN' && status === 'INACTIVE') {
      if (id === actorId)
        throw new ForbiddenAppException('Kendi ADMIN hesabınızı pasif yapamazsınız.');
      const activeAdminCount = await this.prisma.user.count({
        where: { organizationId, role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
      });
      if (activeAdminCount <= 1) {
        throw new ConflictAppException('Son aktif ADMIN pasif yapılamaz.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status },
        select: { id: true, status: true },
      });
      if (status !== 'ACTIVE') {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.auditLogs.record(
        {
          organizationId,
          actorId,
          action: 'UPDATE',
          resource: 'USER_STATUS',
          resourceId: id,
          metadata: { from: target.status, to: status },
        },
        tx,
      );
      return updated;
    });
  }

  async setRole(id: string, organizationId: string, role: AppRole, actorId: string) {
    const target = await this.findByIdInOrganization(id, organizationId);
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      if (id === actorId) throw new ForbiddenAppException('Kendi ADMIN rolünüzü kaldıramazsınız.');
      const activeAdminCount = await this.prisma.user.count({
        where: { organizationId, role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
      });
      if (target.status === 'ACTIVE' && activeAdminCount <= 1) {
        throw new ConflictAppException('Son aktif ADMIN rolü değiştirilemez.');
      }
    }

    const roleName = `${role}_ROLE`;
    const roleRecord = await this.prisma.role.findFirst({
      where: { organizationId, name: roleName, isSystem: true },
      select: { id: true },
    });
    if (!roleRecord) throw new ConflictAppException(`${roleName} sistem rolü bulunamadı.`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role },
        select: { id: true, role: true },
      });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId: roleRecord.id } });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditLogs.record(
        {
          organizationId,
          actorId,
          action: 'UPDATE',
          resource: 'USER_ROLE',
          resourceId: id,
          metadata: { from: target.role, to: role },
        },
        tx,
      );
      return updated;
    });
  }
}
