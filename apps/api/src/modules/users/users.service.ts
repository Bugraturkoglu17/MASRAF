import { Injectable } from '@nestjs/common';

import { NotFoundAppException } from '../../common/exceptions/app.exception';
import type { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdInOrganization(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        departmentId: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundAppException('Kullanıcı');
    }
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
        status: true,
        departmentId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
