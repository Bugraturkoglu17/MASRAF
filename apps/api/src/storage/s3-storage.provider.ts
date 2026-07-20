import { createHash, randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import type { StorageProvider, UploadFileInput, UploadFileResult } from './storage.interface';

/**
 * AWS S3 SDK'sı, endpoint override ile Cloudflare R2 (ve diğer S3 uyumlu
 * sağlayıcılara) karşı çalışır. Bucket private kabul edilir; dış erişim
 * yalnızca süreli imzalı URL ile verilir.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultSignedUrlTtl: number;

  constructor(private readonly configService: ConfigService) {
    const app = this.configService.get<AppConfig>('app')!;
    this.bucket = app.storage.bucket;
    this.defaultSignedUrlTtl = app.storage.signedUrlTtlSeconds;

    this.client = new S3Client({
      region: app.storage.region,
      endpoint: app.storage.endpoint,
      forcePathStyle: app.storage.forcePathStyle,
      credentials: {
        accessKeyId: app.storage.accessKeyId,
        secretAccessKey: app.storage.secretAccessKey,
      },
    });
  }

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const sha256 = createHash('sha256').update(input.body).digest('hex');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: { sha256 },
      }),
    );
    return { key: input.key, sizeBytes: input.body.byteLength, sha256 };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      if ((err as { name?: string }).name !== 'NoSuchKey') throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = this.defaultSignedUrlTtl,
  ): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  /** @deprecated getSignedDownloadUrl() kullanın. */
  async getSignedUrl(key: string, expiresInSeconds = this.defaultSignedUrlTtl): Promise<string> {
    return this.getSignedDownloadUrl(key, expiresInSeconds);
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = this.defaultSignedUrlTtl,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    );
  }

  async healthCheck(): Promise<void> {
    // HeadBucket yerine rastgele bir HeadObject kullan; R2'de HeadBucket izin sorununa neden olabilir.
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: `__hc__/${randomUUID()}` }),
      );
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === 'NotFound' || name === 'NoSuchKey') return; // Bucket erişilebilir, key yok — sağlıklı.
      this.logger.warn('Storage health check başarısız', { error: name });
      throw err;
    }
  }

  async ping(): Promise<void> {
    // Eski API (HeadBucket); bazı R2 token'larında izin hatası verebilir.
    // Yeni kod healthCheck() kullanmalıdır.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      // R2 bazen 403 yerine 200 döner — healthCheck() daha güvenlidir.
      await this.healthCheck();
    }
  }
}
