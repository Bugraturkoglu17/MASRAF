import { neon, types } from '@neondatabase/serverless';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

// Neon HTTP sürücüsünün timestamp değerlerini string olarak döndürmesini sağlar.
// Prisma 5 driver adapter modu ISO string bekler; kayıt edilmezse {} döner.
types.setTypeParser(1114, (val: string) => val); // timestamp without timezone
types.setTypeParser(1184, (val: string) => val); // timestamp with timezone

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL!;
    const sql = neon(connectionString);
    const adapter = new PrismaNeonHTTP(sql);
    super({
      adapter,
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PostgreSQL bağlantısı kuruldu (Neon HTTP adaptörü).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
