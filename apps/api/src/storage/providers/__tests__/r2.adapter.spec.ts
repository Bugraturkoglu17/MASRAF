/**
 * S3StorageProvider'ın Cloudflare R2 uyumluluğunu doğrulayan unit testler.
 * AWS SDK mock'lanır; gerçek R2/MinIO bağlantısı gerekmez.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { S3StorageProvider } from '../../s3-storage.provider';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

const mockSend = jest.fn();
(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(
  () => ({ send: mockSend }) as unknown as S3Client,
);

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

const MockPutObject = PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>;
const MockDeleteObject = DeleteObjectCommand as jest.MockedClass<typeof DeleteObjectCommand>;
const MockGetObject = GetObjectCommand as jest.MockedClass<typeof GetObjectCommand>;

const storageConfig = {
  endpoint: 'https://account-id.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'masraf-test',
  accessKeyId: 'test-key-id',
  secretAccessKey: 'test-secret',
  forcePathStyle: false,
  signedUrlTtlSeconds: 900,
};

async function buildProvider(): Promise<S3StorageProvider> {
  const module = await Test.createTestingModule({
    providers: [
      S3StorageProvider,
      {
        provide: ConfigService,
        useValue: { get: (_key: string) => ({ storage: storageConfig }) },
      },
    ],
  }).compile();
  return module.get(S3StorageProvider);
}

describe('S3StorageProvider (R2 uyumlu)', () => {
  let provider: S3StorageProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    provider = await buildProvider();
  });

  describe('upload', () => {
    it('PutObjectCommand ile doğru parametreleri gönderir ve SHA-256 döner', async () => {
      mockSend.mockResolvedValueOnce({});
      const buffer = Buffer.from('test content');

      const result = await provider.upload({
        key: 'org/uuid-key',
        body: buffer,
        contentType: 'image/jpeg',
      });

      expect(result.key).toBe('org/uuid-key');
      expect(result.sizeBytes).toBe(buffer.byteLength);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const constructorArg = MockPutObject.mock.calls[0]![0];
      expect(constructorArg.Bucket).toBe('masraf-test');
      expect(constructorArg.ContentType).toBe('image/jpeg');
      expect(constructorArg.Key).toBe('org/uuid-key');
    });
  });

  describe('delete', () => {
    it('DeleteObjectCommand gönderir', async () => {
      mockSend.mockResolvedValueOnce({});
      await provider.delete('org/some-key');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const constructorArg = MockDeleteObject.mock.calls[0]![0];
      expect(constructorArg.Key).toBe('org/some-key');
      expect(constructorArg.Bucket).toBe('masraf-test');
    });

    it('NoSuchKey hatası fırlatmaz (sessizce tamamlanır)', async () => {
      const err = Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
      mockSend.mockRejectedValueOnce(err);
      await expect(provider.delete('org/missing')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('nesne varsa true döner', async () => {
      mockSend.mockResolvedValueOnce({});
      await expect(provider.exists('org/key')).resolves.toBe(true);
    });

    it('HeadObject başarısız olursa false döner', async () => {
      mockSend.mockRejectedValueOnce(new Error('Not Found'));
      await expect(provider.exists('org/missing')).resolves.toBe(false);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('GetObjectCommand ile imzalı URL üretir', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://r2.example.com/signed');

      const url = await provider.getSignedDownloadUrl('org/key');

      expect(url).toBe('https://r2.example.com/signed');
      const constructorArg = MockGetObject.mock.calls[0]![0];
      expect(constructorArg.Bucket).toBe('masraf-test');
      expect(constructorArg.Key).toBe('org/key');
    });
  });

  describe('getSignedUploadUrl', () => {
    it('PutObjectCommand ile imzalı yükleme URL üretir', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://r2.example.com/upload');

      const url = await provider.getSignedUploadUrl('org/key', 'image/png');

      expect(url).toBe('https://r2.example.com/upload');
      const constructorArg = MockPutObject.mock.calls[0]![0];
      expect(constructorArg.ContentType).toBe('image/png');
    });
  });

  describe('healthCheck', () => {
    it('NotFound hatası gelirse sağlıklı kabul eder', async () => {
      const err = Object.assign(new Error('NotFound'), { name: 'NotFound' });
      mockSend.mockRejectedValueOnce(err);
      await expect(provider.healthCheck()).resolves.not.toThrow();
    });

    it('NoSuchKey hatası gelirse sağlıklı kabul eder', async () => {
      const err = Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
      mockSend.mockRejectedValueOnce(err);
      await expect(provider.healthCheck()).resolves.not.toThrow();
    });

    it('AccessDenied hatası gelirse hata fırlatır', async () => {
      const err = Object.assign(new Error('AccessDenied'), { name: 'AccessDenied' });
      mockSend.mockRejectedValueOnce(err);
      await expect(provider.healthCheck()).rejects.toThrow();
    });
  });
});
