import type { EnvConfig } from './env.validation';

export interface AppConfig {
  env: EnvConfig['NODE_ENV'];
  port: number;
  webUrl: string;
  apiUrl: string;
  corsOrigins: string[];
  cookieSecret: string;
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
    publicUrl?: string;
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

  return {
    app: {
      env: env.NODE_ENV,
      port: Number(env.API_PORT),
      webUrl: env.WEB_URL,
      apiUrl: env.API_URL,
      corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
      cookieSecret: env.COOKIE_SECRET,
      jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      },
      storage: {
        provider: 's3',
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE),
        publicUrl: env.S3_PUBLIC_URL,
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
