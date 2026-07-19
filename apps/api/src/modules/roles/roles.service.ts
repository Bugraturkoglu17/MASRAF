import { Injectable } from '@nestjs/common';

import type { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByOrganization(organizationId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: { name: 'asc' },
    });
  }
}
