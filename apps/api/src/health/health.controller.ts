import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { Public } from '../common/decorators/public.decorator';

import { DatabaseHealthIndicator } from './prisma.health-indicator';
import { StorageHealthIndicator } from './storage.health-indicator';

/**
 * Northflank ve diğer platformların health check probe'ları için.
 * /health/live: süreç ayakta mı (bağımlılık kontrolü yok, hızlı yanıt).
 * /health/ready: PostgreSQL ve depolama erişilebilir mi (trafiğe hazır mı).
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

  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.databaseIndicator.check('database'),
      () => this.storageIndicator.check('storage'),
    ]);
  }
}
