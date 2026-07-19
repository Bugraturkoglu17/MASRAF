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

  DATABASE_URL: z.string().min(1, 'DATABASE_URL zorunludur.'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET en az 32 karakter olmalıdır.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET en az 32 karakter olmalıdır.'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET en az 32 karakter olmalıdır.'),

  STORAGE_PROVIDER: z.enum(['s3']).default('s3'),
  S3_ENDPOINT: z.string().min(1, 'S3_ENDPOINT zorunludur.'),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET zorunludur.'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID zorunludur.'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY zorunludur.'),
  S3_FORCE_PATH_STYLE: boolFromString,
  S3_PUBLIC_URL: z.string().optional(),

  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS zorunludur (virgülle ayrılmış liste).'),

  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

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
