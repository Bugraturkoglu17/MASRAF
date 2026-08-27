import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// Neon gibi scale-to-zero sağlayan sunucularda compute uykudayken gelen ilk
// sorgu, bağlantı henüz kurulamadığı için bu kodlarla başarısız olabilir.
// Bu kodların hepsi "sorgu veritabanına hiç ulaşmadı" anlamına gelir, bu
// yüzden tek seferlik tekrar denemek güvenlidir — verinin iki kez
// yazılması riski yoktur.
const RETRYABLE_CONNECTION_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024']);
const RETRY_DELAY_MS = 300;

function isRetryableConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_CONNECTION_CODES.has(error.code);
  }
  return error instanceof Prisma.PrismaClientInitializationError;
}

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

    // Sonsuz döngü yok: yalnızca 1 tekrar deneme. İkinci deneme de
    // başarısız olursa gerçek hata olduğu gibi fırlatılır, gizlenmez.
    this.$use(async (params, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
      try {
        return await next(params);
      } catch (error) {
        if (!isRetryableConnectionError(error)) throw error;
        this.logger.warn(
          `Geçici DB bağlantı hatası, ${RETRY_DELAY_MS}ms sonra 1 kez tekrar denenecek: ` +
            `${params.model ?? ''}.${params.action}`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return next(params);
      }
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
