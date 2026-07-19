import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

/**
 * Bu e2e testi gerçek bir PostgreSQL ve S3 uyumlu depolama bağlantısı
 * gerektirir. Çalıştırmadan önce: `docker compose up -d postgres minio`
 * ve `.env` dosyasının dolu olduğundan emin olun. CI pipeline'ında bu adım
 * ayrı bir "test" servisiyle sağlanır (bkz. .gitlab-ci.yml).
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health/live (GET) bağımlılık kontrolü olmadan 200 döner', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('/health/ready (GET) veritabanı ve depolama bağlantısını doğrular', () => {
    return request(app.getHttpServer()).get('/health/ready').expect(200);
  });
});
