import { Module } from '@nestjs/common';

import { S3StorageProvider } from './s3-storage.provider';
import { STORAGE_PROVIDER } from './storage.interface';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: S3StorageProvider,
    },
    StorageService,
  ],
  exports: [STORAGE_PROVIDER, StorageService],
})
export class StorageModule {}
