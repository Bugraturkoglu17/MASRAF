import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import type { AppConfig } from '../config/configuration';

interface RequestWithContext extends IncomingMessage {
  requestId?: string;
  user?: { id?: string; organizationId?: string };
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const app = configService.get<AppConfig>('app')!;
        const isProduction = app.env === 'production';
        return {
          pinoHttp: {
            level: app.logLevel,
            genReqId: (req: IncomingMessage) => (req as RequestWithContext).requestId ?? '',
            transport: isProduction
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.body.password',
                'req.body.currentPassword',
                'req.body.newPassword',
                'req.body.refreshToken',
                'req.body.accessToken',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            customProps: (req: IncomingMessage) => {
              const request = req as RequestWithContext;
              return {
                requestId: request.requestId,
                userId: request.user?.id,
                organizationId: request.user?.organizationId,
              };
            },
            customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
              `${req.method} ${req.url} -> ${res.statusCode}`,
            customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
              `${req.method} ${req.url} -> ${res.statusCode}`,
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
