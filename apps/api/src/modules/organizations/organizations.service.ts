import { Injectable } from '@nestjs/common';

import { NotFoundAppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!organization) {
      throw new NotFoundAppException('Organizasyon');
    }
    return organization;
  }
}
