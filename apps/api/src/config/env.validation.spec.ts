import { validateEnv } from './env.validation';

const validEnv = {
  NODE_ENV: 'test',
  API_PORT: '4000',
  WEB_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:4000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/masraf_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  COOKIE_SECRET: 'c'.repeat(32),
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'test-bucket',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
  CORS_ORIGINS: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('geçerli ortam değişkenlerini kabul eder ve varsayılanları uygular', () => {
    const result = validateEnv(validEnv);
    expect(result.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(result.API_PORT).toBe(4000);
  });

  it('DATABASE_URL eksikse anlaşılır bir hata fırlatır', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('kısa JWT secret değerlerini reddeder', () => {
    expect(() => validateEnv({ ...validEnv, JWT_ACCESS_SECRET: 'kisa' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('geçersiz NODE_ENV değerini reddeder', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'yanlis' })).toThrow();
  });
});
