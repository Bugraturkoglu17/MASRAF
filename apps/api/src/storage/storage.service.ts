import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import { generateStorageKey } from './file-validation';
import type { StoredFile, StorageProvider } from './storage.interface';
import { STORAGE_PROVIDER } from './storage.interface';

/**
 * Uygulama katmanı depolama servisi.
 * StorageProvider'ı sararak key üretimi ve metadata yönetimi sağlar.
 * Dosya türü ve boyut doğrulaması (assertValidAttachment) çağıran katmanda yapılmalıdır.
 */
@Injectable()
export class StorageService {
  private readonly signedUrlTtlSeconds: number;

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
    private readonly configService: ConfigService,
  ) {
    const cfg = this.configService.get<AppConfig['storage']>('app.storage')!;
    this.signedUrlTtlSeconds = cfg.signedUrlTtlSeconds;
  }

  /**
   * Dosyayı depoya yükler ve veritabanında saklanacak metadata'yı döndürür.
   * Binary veri veritabanında tutulmaz; yalnızca key ve metadata saklanır.
   */
  async storeAttachment(
    organizationId: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<StoredFile> {
    const fileKey = generateStorageKey(organizationId, originalName);

    const result = await this.provider.upload({
      key: fileKey,
      body: buffer,
      contentType: mimeType,
    });

    return {
      fileKey: result.key,
      fileName: originalName,
      mimeType,
      sizeBytes: result.sizeBytes,
      sha256: result.sha256,
    };
  }

  /** Kısa ömürlü indirme URL'i üretir; URL yalnızca backend'den istemciye iletilir. */
  async getSignedDownloadUrl(fileKey: string): Promise<string> {
    return this.provider.getSignedDownloadUrl(fileKey, this.signedUrlTtlSeconds);
  }

  /**
   * Tarayıcının doğrudan R2'ye yüklemesi için imzalı yükleme URL'i üretir.
   * Yükleme tamamlandıktan sonra fileKey backend'e gönderilmeli ve doğrulanmalıdır.
   */
  async getSignedUploadUrl(
    organizationId: string,
    originalName: string,
    mimeType: string,
  ): Promise<{ fileKey: string; uploadUrl: string; expiresIn: number }> {
    const fileKey = generateStorageKey(organizationId, originalName);
    const uploadUrl = await this.provider.getSignedUploadUrl(
      fileKey,
      mimeType,
      this.signedUrlTtlSeconds,
    );
    return { fileKey, uploadUrl, expiresIn: this.signedUrlTtlSeconds };
  }

  async deleteFile(fileKey: string): Promise<void> {
    return this.provider.delete(fileKey);
  }

  async fileExists(fileKey: string): Promise<boolean> {
    return this.provider.exists(fileKey);
  }

  async ping(): Promise<void> {
    return this.provider.ping();
  }
}
