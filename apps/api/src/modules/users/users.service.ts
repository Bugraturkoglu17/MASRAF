import { Injectable } from '@nestjs/common';
import type { AppRole } from '@prisma/client';

import { NotFoundAppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.user.update({
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
        organization: { select: { name: true } },
      },
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

  async setStatus(id: string, organizationId: string, status: 'ACTIVE' | 'INACTIVE') {
    await this.findByIdInOrganization(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async setRole(id: string, organizationId: string, role: AppRole) {
    await this.findByIdInOrganization(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    });
  }
}
