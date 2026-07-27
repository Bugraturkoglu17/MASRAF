import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PostgreSQL bağlantısı kuruldu.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    // Bağlantı tek başına yeterli değildir: production image yeni Prisma
    // client ile açılıp migration uygulanmadıysa karar/bildirim akışı 500 verir.
    await this.$queryRaw`SELECT "expenseId", "eventKey" FROM "notifications" LIMIT 0`;
    return true;
  }
}
