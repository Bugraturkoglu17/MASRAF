import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

/** Gerçek PostgreSQL bağlantısı ve `pnpm db:seed` çalıştırılmış olmasını gerektirir. */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/live', 'health/ready', 'health/storage'],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/auth/login (POST) geçersiz istekte VALIDATION_ERROR döner', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'gecersiz', password: '123' })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.requestId).toBeDefined();
      });
  });

  it('/api/v1/auth/login (POST) yanlış kimlik bilgisiyle 401 döner', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'olmayan@example.com', password: 'YanlisSifre123' })
      .expect(401);
  });

  it('/api/v1/users/me (GET) token olmadan 401 döner', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });
});
