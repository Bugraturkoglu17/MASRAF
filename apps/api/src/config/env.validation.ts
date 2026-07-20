import { z } from 'zod';

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),

  // ── Veritabanı (Neon PostgreSQL) ──────────────────────────────────────────
  // DATABASE_URL: runtime'da Neon pooler bağlantısı (PgBouncer transaction mode)
  // DIRECT_URL:   prisma migrate / generate için doğrudan Neon bağlantısı
  DATABASE_URL: z.string().min(1, 'DATABASE_URL zorunludur.'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL zorunludur (Prisma migration için).'),

  // ── JWT Kimlik Doğrulama ──────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET en az 32 karakter olmalıdır.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET en az 32 karakter olmalıdır.'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET en az 32 karakter olmalıdır.'),

  // ── Cloudflare R2 Dosya Depolama ──────────────────────────────────────────
  STORAGE_PROVIDER: z.enum(['s3']).default('s3'),
  R2_ENDPOINT: z.string().min(1, 'R2_ENDPOINT zorunludur.'),
  R2_REGION: z.string().default('auto'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET zorunludur.'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID zorunludur.'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY zorunludur.'),
  R2_FORCE_PATH_STYLE: boolFromString,
  R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  // ── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS zorunludur (virgülle ayrılmış liste).'),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  // ── Loglama ──────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // ── E-posta (opsiyonel) ───────────────────────────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // ── Hata izleme (opsiyonel) ───────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * NestJS ConfigModule.validate hook'una bağlanır. Eksik/hatalı değişkenlerde
 * uygulama, hangi alanların sorunlu olduğunu açıkça belirterek başlamayı reddeder.
 * Hiçbir gizli değer log'a yazılmaz.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Ortam değişkenleri doğrulaması başarısız oldu. Aşağıdaki alanları kontrol edin:\n${issues}`,
    );
  }
  return result.data;
}
