import { HealthCheckService, type HealthCheckStatus } from '@nestjs/terminus';
import { Test, type TestingModule } from '@nestjs/testing';

import { HealthController } from '../health.controller';
import { DatabaseHealthIndicator } from '../prisma.health-indicator';
import { StorageHealthIndicator } from '../storage.health-indicator';

const healthResult = (status: HealthCheckStatus = 'ok') => ({
  status,
  info: {},
  error: {},
  details: {},
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let databaseIndicator: jest.Mocked<DatabaseHealthIndicator>;
  let storageIndicator: jest.Mocked<StorageHealthIndicator>;

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;

    databaseIndicator = {
      check: jest.fn(),
    } as unknown as jest.Mocked<DatabaseHealthIndicator>;

    storageIndicator = {
      check: jest.fn(),
    } as unknown as jest.Mocked<StorageHealthIndicator>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: DatabaseHealthIndicator, useValue: databaseIndicator },
        { provide: StorageHealthIndicator, useValue: storageIndicator },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('GET /health/live', () => {
    it('status ok ve timestamp döner', () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('GET /health', () => {
    it('health check sonucunu döner', async () => {
      healthCheckService.check.mockResolvedValueOnce(healthResult() as never);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check.mock.calls[0]?.[0]).toHaveLength(2);
    });
  });

  describe('GET /health/ready', () => {
    it('readiness check sonucunu döner', async () => {
      healthCheckService.check.mockResolvedValueOnce(healthResult() as never);

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check.mock.calls[0]?.[0]).toHaveLength(1);
    });

    it('veritabanı erişilemezse hata yayar', async () => {
      healthCheckService.check.mockRejectedValueOnce(
        new Error('Veritabanı bağlantısı sağlanamadı'),
      );

      await expect(controller.ready()).rejects.toThrow('Veritabanı bağlantısı sağlanamadı');
    });
  });

  describe('GET /health/storage', () => {
    it('R2 durumunu readiness dışında ayrı kontrol eder', async () => {
      healthCheckService.check.mockResolvedValueOnce(healthResult() as never);
      await controller.storage();
      expect(healthCheckService.check.mock.calls[0]?.[0]).toHaveLength(1);
    });
  });
});
