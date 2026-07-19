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
const PREFIX_EXCLUDED_ROUTES = ['health', 'health/live', 'health/ready'];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, { exclude: PREFIX_EXCLUDED_ROUTES });

  app.use(helmet());
  app.use(cookieParser(appConfig.cookieSecret));
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Masraf Yönetim Sistemi API')
    .setDescription('Masraf yönetim sisteminin REST API dokümantasyonu')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  await app.listen(appConfig.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ${appConfig.port} portunda çalışıyor (${appConfig.env}).`);
}

bootstrap().catch((error) => {
  // Ortam değişkeni doğrulaması veya diğer başlangıç hataları burada yakalanır.

  console.error('Uygulama başlatılamadı:', error);
  process.exit(1);
});
