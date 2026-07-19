import { Injectable } from '@nestjs/common';

import type { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByOrganization(organizationId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { organizationId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
