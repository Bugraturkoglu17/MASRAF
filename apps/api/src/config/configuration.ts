import type { EnvConfig } from './env.validation';

export interface AppConfig {
  env: EnvConfig['NODE_ENV'];
  environment: string;
  version: string;
  commitSha: string;
  buildDate: string;
  port: number;
  webUrl: string;
  apiUrl: string;
  corsOrigins: string[];
  cookieSecret: string;
  cookieDomain?: string;
  swaggerEnabled: boolean;
  maintenance: { mode: boolean; message: string };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  storage: {
    provider: 's3';
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    signedUrlTtlSeconds: number;
    maxAttachmentsPerExpense: number;
    maxAttachmentSizeBytes: number;
  };
  rateLimit: {
    ttlMs: number;
    max: number;
    authMax: number;
  };
  logLevel: string;
}

export default (): { app: AppConfig } => {
  const env = process.env as unknown as EnvConfig;
  const isEnabled = (value: unknown, defaultValue = false): boolean => {
    if (value === undefined || value === null || value === '') return defaultValue;
    return value === true || value === 'true';
  };

  return {
    app: {
      env: env.NODE_ENV,
      environment: env.APP_ENVIRONMENT ?? env.NODE_ENV,
      version: env.APP_VERSION,
      commitSha: env.APP_COMMIT_SHA,
      buildDate: env.APP_BUILD_DATE,
      port: Number(env.PORT ?? env.API_PORT ?? 4000),
      webUrl: env.WEB_URL,
      apiUrl: env.API_URL,
      corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
      cookieSecret: env.COOKIE_SECRET,
      cookieDomain: env.COOKIE_DOMAIN,
      swaggerEnabled: env.NODE_ENV !== 'production' && isEnabled(env.ENABLE_SWAGGER, true),
      maintenance: {
        mode: isEnabled(env.MAINTENANCE_MODE),
        message: env.MAINTENANCE_MESSAGE,
      },
      jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      },
      storage: {
        provider: 's3',
        endpoint: env.R2_ENDPOINT,
        region: env.R2_REGION,
        bucket: env.R2_BUCKET,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        forcePathStyle: isEnabled(env.R2_FORCE_PATH_STYLE),
        signedUrlTtlSeconds: Number(env.R2_SIGNED_URL_TTL_SECONDS),
        maxAttachmentsPerExpense: Number(env.MAX_ATTACHMENTS_PER_EXPENSE),
        maxAttachmentSizeBytes: Number(env.MAX_ATTACHMENT_SIZE_BYTES),
      },
      rateLimit: {
        ttlMs: Number(env.RATE_LIMIT_TTL_MS),
        max: Number(env.RATE_LIMIT_MAX),
        authMax: Number(env.AUTH_RATE_LIMIT_MAX),
      },
      logLevel: env.LOG_LEVEL,
    },
  };
};
