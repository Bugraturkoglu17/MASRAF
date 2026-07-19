import { createHash } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import type { StorageProvider, UploadFileInput, UploadFileResult } from './storage.interface';

/**
 * AWS S3 SDK'sı, endpoint override ile herhangi bir S3 uyumlu sağlayıcıya
 * (Cloudflare R2, Backblaze B2, MinIO, AWS S3) karşı çalışır. Bucket private
 * kabul edilir; dış erişim yalnızca süreli imzalı URL ile verilir.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const app = this.configService.get<AppConfig>('app')!;
    this.bucket = app.storage.bucket;
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
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}
