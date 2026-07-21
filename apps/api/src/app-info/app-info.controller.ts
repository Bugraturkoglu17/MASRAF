import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../common/decorators/public.decorator';
import type { AppConfig } from '../config/configuration';

@Controller('app')
export class AppInfoController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get('version')
  version() {
    const app = this.configService.get<AppConfig>('app')!;
    return {
      version: app.version,
      commitSha: app.commitSha,
      buildDate: app.buildDate,
      environment: app.environment,
    };
  }

  @Public()
  @Get('config')
  publicConfig() {
    const app = this.configService.get<AppConfig>('app')!;
    return {
      maintenanceMode: app.maintenance.mode,
      maintenanceMessage: app.maintenance.message,
      uploads: {
        maxFiles: app.storage.maxAttachmentsPerExpense,
        maxFileSizeBytes: app.storage.maxAttachmentSizeBytes,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'application/pdf',
        ],
      },
    };
  }
}
