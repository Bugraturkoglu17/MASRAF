import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

const API_PREFIX = 'api/v1';
// Health check'ler platform prob'ları (Northflank vb.) için prefix dışında kalır.
const PREFIX_EXCLUDED_ROUTES = ['health', 'health/live', 'health/ready', 'health/storage'];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, { exclude: PREFIX_EXCLUDED_ROUTES });

  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: false });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts:
        appConfig.env === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cookieParser(appConfig.cookieSecret));
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });

  if (appConfig.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Masraf Yönetim Sistemi API')
      .setDescription('Masraf yönetim sisteminin REST API dokümantasyonu')
      .setVersion(appConfig.version)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(appConfig.port, '0.0.0.0');
  app.get(Logger).log(`API ${appConfig.port} portunda çalışıyor (${appConfig.environment}).`);
}

bootstrap().catch((error: unknown) => {
  // Ortam değişkeni doğrulaması veya diğer başlangıç hataları burada yakalanır.

  const safeMessage = error instanceof Error ? error.message : 'Bilinmeyen başlangıç hatası';
  console.error('Uygulama başlatılamadı:', safeMessage);
  process.exit(1);
});
