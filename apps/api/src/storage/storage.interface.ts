export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface UploadFileInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  sizeBytes: number;
  sha256: string;
}

export interface StoredFile {
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

/**
 * Bağımsız depolama sağlayıcı sözleşmesi.
 * Cloudflare R2, AWS S3 veya MinIO bu arayüzü uygulayabilir.
 */
export interface StorageProvider {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;

  /**
   * Tarayıcının doğrudan depoya yüklemesi için kısa ömürlü imzalı PUT URL üretir.
   * Yükleme sonrası backend'e fileKey iletilmeli ve doğrulanmalıdır.
   */
  getSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Özel nesneye geçici okuma erişimi sağlayan imzalı GET URL üretir.
   */
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Depolama servisine erişilebilirlik kontrolü yapar.
   * Hata fırlatırsa sağlayıcı erişilemez demektir.
   */
  healthCheck(): Promise<void>;

  /**
   * @deprecated healthCheck() ile aynıdır; NestJS health indicator uyumluluğu için korundu.
   */
  ping(): Promise<void>;
}
