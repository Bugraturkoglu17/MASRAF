import { z } from 'zod';

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().optional(),
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
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('15m'),
    JWT_REFRESH_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('30d'),

    COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET en az 32 karakter olmalıdır.'),

    // ── Cloudflare R2 Dosya Depolama ──────────────────────────────────────────
    STORAGE_PROVIDER: z.enum(['s3']).default('s3'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ENDPOINT: z.string().min(1, 'R2_ENDPOINT zorunludur.'),
    R2_REGION: z.string().default('auto'),
    R2_BUCKET: z.string().min(1, 'R2_BUCKET zorunludur.'),
    R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID zorunludur.'),
    R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY zorunludur.'),
    R2_FORCE_PATH_STYLE: boolFromString,
    R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().max(900).default(900),
    MAX_ATTACHMENTS_PER_EXPENSE: z.coerce.number().int().positive().max(20).default(5),
    MAX_ATTACHMENT_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024)
      .default(15 * 1024 * 1024),

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

    // ── Release ve işletim ───────────────────────────────────────────────────
    APP_VERSION: z.string().default('0.1.0-dev'),
    APP_COMMIT_SHA: z.string().default('local'),
    APP_BUILD_DATE: z.string().default('unknown'),
    APP_ENVIRONMENT: z.enum(['development', 'test', 'staging', 'production']).optional(),
    COOKIE_DOMAIN: z.string().optional(),
    ENABLE_SWAGGER: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    MAINTENANCE_MODE: boolFromString,
    MAINTENANCE_MESSAGE: z.string().max(300).default('Planlı bakım çalışması devam ediyor.'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    const isHttps = (value: string) => value.startsWith('https://');
    const hasSsl = (value: string) => /[?&]sslmode=require(?:&|$)/i.test(value);
    const placeholder = /(change[-_ ]?me|example|localhost|<[^>]+>)/i;
    const seconds = (value: string) => {
      const match = /^(\d+)([smhd])$/.exec(value)!;
      return Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]!] ?? 1);
    };

    if (!isHttps(env.WEB_URL)) issue('WEB_URL', 'Production WEB_URL HTTPS olmalıdır.');
    if (!isHttps(env.API_URL)) issue('API_URL', 'Production API_URL HTTPS olmalıdır.');
    if (!hasSsl(env.DATABASE_URL))
      issue('DATABASE_URL', 'Production DATABASE_URL sslmode=require içermelidir.');
    if (!hasSsl(env.DIRECT_URL))
      issue('DIRECT_URL', 'Production DIRECT_URL sslmode=require içermelidir.');
    if (!isHttps(env.R2_ENDPOINT)) issue('R2_ENDPOINT', 'Production R2_ENDPOINT HTTPS olmalıdır.');
    if (!env.R2_ACCOUNT_ID)
      issue('R2_ACCOUNT_ID', 'Production ortamında R2_ACCOUNT_ID zorunludur.');
    if (env.APP_ENVIRONMENT !== 'production') {
      issue('APP_ENVIRONMENT', 'Production ortamında APP_ENVIRONMENT=production olmalıdır.');
    }
    if (env.APP_VERSION === '0.1.0-dev')
      issue('APP_VERSION', 'Production APP_VERSION açıkça tanımlanmalıdır.');

    const origins = env.CORS_ORIGINS.split(',').map((value) => value.trim());
    if (origins.some((origin) => origin === '*' || !isHttps(origin) || placeholder.test(origin))) {
      issue(
        'CORS_ORIGINS',
        'Production CORS originleri açık HTTPS adresleri olmalı; wildcard/localhost kullanılamaz.',
      );
    }

    const secrets = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.COOKIE_SECRET];
    if (secrets.some((secret) => placeholder.test(secret))) {
      issue('JWT_ACCESS_SECRET', 'Production secret değerleri placeholder olamaz.');
    }
    if (
      [env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_BUCKET].some((value) =>
        placeholder.test(value),
      )
    ) {
      issue('R2_ACCESS_KEY_ID', 'Production R2 değerleri placeholder olamaz.');
    }
    if (seconds(env.JWT_ACCESS_EXPIRES_IN) > 30 * 60) {
      issue(
        'JWT_ACCESS_EXPIRES_IN',
        'Access token ömrü production ortamında en fazla 30 dakika olmalıdır.',
      );
    }
    if (seconds(env.JWT_REFRESH_EXPIRES_IN) > 30 * 86400) {
      issue(
        'JWT_REFRESH_EXPIRES_IN',
        'Refresh token ömrü production ortamında en fazla 30 gün olmalıdır.',
      );
    }
    if (new Set(secrets).size !== secrets.length) {
      issue('JWT_ACCESS_SECRET', 'JWT ve cookie secret değerleri birbirinden farklı olmalıdır.');
    }
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
