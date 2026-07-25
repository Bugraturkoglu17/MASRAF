import { Injectable } from '@nestjs/common';
import type { AppRole, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
  ValidationAppException,
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

export interface AdminCreateUserDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  roleName: 'USER' | 'MANAGER';
  tempPassword: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface AdminUpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  iban?: string | null;
  company?: string | null;
  jobTitle?: string | null;
}

export interface AdminListUsersFilter {
  search?: string;
  role?: AppRole;
  status?: 'ACTIVE' | 'INACTIVE';
  profileCompleted?: boolean;
  mustChangePassword?: boolean;
}

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  iban: true,
  company: true,
  jobTitle: true,
  role: true,
  profileCompleted: true,
  status: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Türkiye telefon numarasını +905XXXXXXXXX biçimine çevirir. */
export function normalizeTurkishPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let rest = digits;
  if (rest.startsWith('90')) rest = rest.slice(2);
  if (rest.startsWith('0')) rest = rest.slice(1);
  if (!/^5\d{9}$/.test(rest)) {
    throw new ValidationAppException(
      [{ field: 'phone', message: 'Geçerli bir Türkiye mobil numarası giriniz (5XX XXX XX XX).' }],
      'Geçersiz telefon numarası.',
    );
  }
  return `+90${rest}`;
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
        mustChangePassword: true,
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

  /** İlk girişte zorunlu şifre değiştirme (kullanıcının kendi işlemi). */
  async changeOwnPassword(
    id: string,
    organizationId: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) {
    if (newPassword.length < 8) {
      throw new ValidationAppException(
        [{ field: 'newPassword', message: 'Şifre en az 8 karakter olmalıdır.' }],
        'Şifre en az 8 karakter olmalıdır.',
      );
    }
    if (newPassword !== newPasswordConfirm) {
      throw new ValidationAppException(
        [{ field: 'newPasswordConfirm', message: 'Şifreler eşleşmiyor.' }],
        'Şifreler eşleşmiyor.',
      );
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
      });
      await this.auditLogs.record(
        {
          organizationId,
          actorId: id,
          action: 'UPDATE',
          resource: 'USER_PASSWORD',
          resourceId: id,
        },
        tx,
      );
    });
    return { message: 'Şifreniz güncellendi.' };
  }

  async findByIdInOrganization(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        ...ADMIN_USER_SELECT,
        departmentId: true,
      },
    });
    if (!user) throw new NotFoundAppException('Kullanıcı');
    return user;
  }

  async listByOrganization(organizationId: string, filter: AdminListUsersFilter = {}) {
    const searchDigits = filter.search?.replace(/\D/g, '').replace(/^(90|0)/, '') ?? '';

    const where: Prisma.UserWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.profileCompleted !== undefined
        ? { profileCompleted: filter.profileCompleted }
        : {}),
      ...(filter.mustChangePassword !== undefined
        ? { mustChangePassword: filter.mustChangePassword }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
              ...(searchDigits.length >= 3 ? [{ phone: { contains: searchDigits } }] : []),
            ],
          }
        : {}),
    };

    return this.prisma.user.findMany({
      where,
      select: ADMIN_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminStats(organizationId: string) {
    const base = { organizationId, deletedAt: null } as const;
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      activeManagers,
      profileIncomplete,
      firstLoginPending,
      recent,
    ] = await Promise.all([
      this.prisma.user.count({ where: base }),
      this.prisma.user.count({ where: { ...base, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { ...base, status: { not: 'ACTIVE' } } }),
      this.prisma.user.count({ where: { ...base, role: 'MANAGER', status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { ...base, profileCompleted: false } }),
      this.prisma.user.count({ where: { ...base, mustChangePassword: true } }),
      this.prisma.user.findMany({
        where: base,
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          profileCompleted: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      managers: { active: activeManagers, limit: 1 },
      profileIncomplete,
      firstLoginPending,
      recentUsers: recent.map((u) => ({
        id: u.id,
        fullName: `${u.firstName} ${u.lastName}`,
        phone: u.phone,
        role: u.role,
        status: u.status,
        profileCompleted: u.profileCompleted,
        createdAt: u.createdAt,
      })),
    };
  }

  async getSystemOverview(organizationId: string) {
    const [organization, usedUsers] = await Promise.all([
      this.prisma.organization.findFirst({ where: { id: organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
    ]);
    if (!organization) throw new NotFoundAppException('Organizasyon');

    return {
      userLimit: organization.userLimit,
      usedUsers,
      remainingUsers: Math.max(0, organization.userLimit - usedUsers),
      companyName: organization.name,
      defaultCurrency: 'TRY',
      defaultLanguage: 'TR',
    };
  }

  async getManagerAccount(organizationId: string) {
    const managers = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, role: 'MANAGER' },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: ADMIN_USER_SELECT,
    });
    const activeIds = managers.map((m) => m.id);
    const sessionCounts = activeIds.length
      ? await this.prisma.refreshToken.groupBy({
          by: ['userId'],
          where: { userId: { in: activeIds }, revokedAt: null },
          _count: true,
        })
      : [];

    return {
      manager: managers.find((m) => m.status === 'ACTIVE') ?? managers[0] ?? null,
      others: managers.filter((m) => m.id !== (managers[0]?.id ?? '')).slice(0, 5),
      activeSessionCounts: Object.fromEntries(sessionCounts.map((s) => [s.userId, s._count])),
    };
  }

  async createUser(organizationId: string, dto: AdminCreateUserDto, actorId: string) {
    const overview = await this.getSystemOverview(organizationId);
    if (overview.usedUsers >= overview.userLimit) {
      throw new ForbiddenAppException(
        `Kullanıcı limiti dolu (${overview.usedUsers}/${overview.userLimit}). Yeni kullanıcı eklenemez.`,
      );
    }

    const phone = normalizeTurkishPhone(dto.phone);
    const phoneTaken = await this.prisma.user.findUnique({ where: { phone } });
    if (phoneTaken) {
      throw new ConflictAppException('Bu telefon numarasıyla kayıtlı bir kullanıcı zaten var.');
    }

    const email = dto.email?.trim() || `u${phone.replace('+', '')}@masraf.local`;
    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw new ConflictAppException('Bu e-posta adresi zaten kullanımda.');

    if (dto.roleName === 'MANAGER') {
      await this.assertNoOtherActiveManager(organizationId);
    }

    const roleRecord = await this.prisma.role.findFirst({
      where: { organizationId, name: `${dto.roleName}_ROLE`, isSystem: true },
      select: { id: true },
    });
    if (!roleRecord) throw new ConflictAppException(`${dto.roleName}_ROLE sistem rolü bulunamadı.`);

    const passwordHash = await argon2.hash(dto.tempPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone,
          passwordHash,
          role: dto.roleName,
          status: dto.status ?? 'ACTIVE',
          mustChangePassword: true,
          profileCompleted: false,
        },
        select: ADMIN_USER_SELECT,
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: roleRecord.id } });
      await this.auditLogs.record(
        {
          organizationId,
          actorId,
          action: 'CREATE',
          resource: 'USER',
          resourceId: user.id,
          metadata: { email: user.email, phone, role: dto.roleName },
        },
        tx,
      );
      return user;
    });
  }

  async updateUserByAdmin(
    id: string,
    organizationId: string,
    dto: AdminUpdateUserDto,
    actorId: string,
  ) {
    const existing = await this.findByIdInOrganization(id, organizationId);

    const data: Prisma.UserUpdateInput = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.iban !== undefined ? { iban: dto.iban } : {}),
      ...(dto.company !== undefined ? { company: dto.company } : {}),
      ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
    };

    if (dto.phone !== undefined) {
      const phone = normalizeTurkishPhone(dto.phone);
      const taken = await this.prisma.user.findFirst({ where: { phone, id: { not: id } } });
      if (taken)
        throw new ConflictAppException('Bu telefon numarası başka bir kullanıcıda kayıtlı.');
      (data as { phone?: string }).phone = phone;
    }
    if (dto.email !== undefined && dto.email !== existing.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (taken) throw new ConflictAppException('Bu e-posta adresi zaten kullanımda.');
      (data as { email?: string }).email = dto.email;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data, select: ADMIN_USER_SELECT });
      await this.auditLogs.record(
        {
          organizationId,
          actorId,
          action: 'UPDATE',
          resource: 'USER',
          resourceId: id,
          metadata: { fields: Object.keys(dto) },
        },
        tx,
      );
      return updated;
    });
  }

  /** Admin geçici şifre tanımlar; düz metin saklanmaz, oturumlar kapatılır. */
  async resetPassword(
    id: string,
    organizationId: string,
    newPassword: string,
    newPasswordConfirm: string,
    actorId: string,
  ) {
    await this.findByIdInOrganization(id, organizationId);

    if (newPassword.length < 8) {
      throw new ValidationAppException(
        [{ field: 'newPassword', message: 'Şifre en az 8 karakter olmalıdır.' }],
        'Şifre en az 8 karakter olmalıdır.',
      );
    }
    if (newPassword !== newPasswordConfirm) {
      throw new ValidationAppException(
        [{ field: 'newPasswordConfirm', message: 'Şifreler eşleşmiyor.' }],
        'Şifreler eşleşmiyor.',
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditLogs.record(
        { organizationId, actorId, action: 'PASSWORD_RESET', resource: 'USER', resourceId: id },
        tx,
      );
    });

    return {
      message:
        'Geçici şifre başarıyla oluşturuldu. Kullanıcı ilk girişte şifresini değiştirmek zorundadır.',
    };
  }

  async revokeSessions(id: string, organizationId: string, actorId: string) {
    await this.findByIdInOrganization(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditLogs.record(
        { organizationId, actorId, action: 'SESSIONS_REVOKED', resource: 'USER', resourceId: id },
        tx,
      );
    });

    return { message: 'Kullanıcının tüm oturumları kapatıldı.' };
  }

  async getUserAuditLogs(
    id: string,
    organizationId: string,
    query: { page?: number; pageSize?: number },
  ) {
    return this.auditLogs.listForUser(organizationId, id, query);
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
    if (target.role === 'MANAGER' && status === 'ACTIVE' && target.status !== 'ACTIVE') {
      await this.assertNoOtherActiveManager(organizationId, id);
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
          action: status === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE',
          resource: 'USER',
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
    if (role === 'MANAGER' && target.role !== 'MANAGER' && target.status === 'ACTIVE') {
      await this.assertNoOtherActiveManager(organizationId, id);
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
          action: 'ASSIGN',
          resource: 'USER',
          resourceId: id,
          metadata: { from: target.role, to: role },
        },
        tx,
      );
      return updated;
    });
  }

  /** Sistemde ikinci bir aktif MANAGER hesabına izin verme. */
  private async assertNoOtherActiveManager(
    organizationId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const count = await this.prisma.user.count({
      where: {
        organizationId,
        deletedAt: null,
        status: 'ACTIVE',
        role: 'MANAGER',
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (count >= 1) {
      throw new ConflictAppException('Sistemde yalnızca bir aktif yönetici (MANAGER) bulunabilir.');
    }
  }
}
