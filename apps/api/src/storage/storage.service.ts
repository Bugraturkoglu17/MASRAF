import { Inject, Injectable } from '@nestjs/common';

import { assertValidAttachment, generateStorageKey } from './file-validation';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.interface';

export interface StoredAttachmentMetadata {
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

/**
 * Kontrolör/servislerin doğrudan StorageProvider ile değil bu servisle
 * konuşmasını sağlar: dosya doğrulama, anahtar üretimi ve provider çağrısı
 * tek yerde birleşir.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async storeAttachment(
    organizationId: string,
    fileName: string,
    mimeType: string,
    body: Buffer,
  ): Promise<StoredAttachmentMetadata> {
    assertValidAttachment(fileName, mimeType, body.byteLength);
    const key = generateStorageKey(organizationId, fileName);
    const result = await this.provider.upload({ key, body, contentType: mimeType });
    return {
      fileKey: result.key,
      fileName,
      mimeType,
      sizeBytes: result.sizeBytes,
      sha256: result.sha256,
    };
  }

  async getSignedDownloadUrl(fileKey: string, expiresInSeconds = 300): Promise<string> {
    return this.provider.getSignedUrl(fileKey, expiresInSeconds);
  }

  async deleteAttachment(fileKey: string): Promise<void> {
    await this.provider.delete(fileKey);
  }
}
