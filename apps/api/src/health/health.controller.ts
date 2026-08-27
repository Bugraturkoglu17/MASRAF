import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { Public } from '../common/decorators/public.decorator';

import { DatabaseHealthIndicator } from './prisma.health-indicator';
import { StorageHealthIndicator } from './storage.health-indicator';

/**
 * Northflank ve diğer platformların health check probe'ları için.
 *
 * /health/live:  süreç ayakta mı (bağımlılık kontrolü yok, hızlı yanıt).
 * /health/ready: Northflank'in SÜREKLİ çağırdığı readiness probe. Kasıtlı
 * olarak veritabanına dokunmaz — aksi halde probe interval'ı kadar sık
 * (genelde 10-30s) Neon'a sorgu gider ve compute hiç idle'a düşemez.
 * Process ayakta ve Nest DI container'ı kurulmuşsa "ready" kabul edilir;
 * gerçek DB kesintisi zaten $connect() başarısız olduğunda container'ı
 * crash-loop'a sokar (bkz. PrismaService.onModuleInit), yani toplam DB
 * erişilemezliği bu yolla da yakalanır.
 * /health/db:    PostgreSQL'e (SELECT 1 + şema kontrolü) gerçekten dokunan
 * tek endpoint. Northflank probe'una BAĞLANMAMALIDIR — yalnızca manuel
 * kontrol veya deploy sonrası tek seferlik smoke test için kullanılır.
 * /health/storage: R2 durumu ayrı izlenir; geçici R2 kesintisi container'ı
 * yeniden başlatmamalıdır.
 * /health: DB + storage'ı birlikte döner, yalnızca manuel/monitoring amaçlı.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseIndicator: DatabaseHealthIndicator,
    private readonly storageIndicator: StorageHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.databaseIndicator.check('database'),
      () => this.storageIndicator.check('storage'),
    ]);
  }

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Northflank readiness probe hedefi. Kasıtlı olarak DB sorgusu içermez —
   * bkz. sınıf üstü yorum. Gerçek DB durumu için /health/db kullanın.
   */
  @Public()
  @Get('ready')
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Gerçek PostgreSQL erişilebilirlik kontrolü. Northflank probe'u OLARAK
   * bağlanmamalıdır — yalnızca manuel/monitoring amaçlı çağrılmalıdır.
   */
  @Public()
  @Get('db')
  @HealthCheck()
  db() {
    return this.health.check([() => this.databaseIndicator.check('database')]);
  }

  @Public()
  @Get('storage')
  @HealthCheck()
  storage() {
    return this.health.check([() => this.storageIndicator.check('storage')]);
  }
}
