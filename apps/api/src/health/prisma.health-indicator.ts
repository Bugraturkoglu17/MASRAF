import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.isHealthy();
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('Veritabanı bağlantısı sağlanamadı', this.getStatus(key, false));
    }
  }
}
