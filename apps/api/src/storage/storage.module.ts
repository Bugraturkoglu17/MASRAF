import { Module } from '@nestjs/common';

import { S3StorageProvider } from './s3-storage.provider';
import { STORAGE_PROVIDER } from './storage.interface';
import { StorageService } from './storage.service';

/**
 * StorageModule, S3StorageProvider'ı (Cloudflare R2 + MinIO uyumlu)
 * STORAGE_PROVIDER token'ı üzerinden enjekte eder.
 * Farklı bir sağlayıcıya geçmek için yalnızca bu modülü güncellemek yeterlidir.
 */
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: S3StorageProvider,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
