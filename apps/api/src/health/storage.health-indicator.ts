import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';

import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.interface';

@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.storage.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Depolama bağlantısı sağlanamadı',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
