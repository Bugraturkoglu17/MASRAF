export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

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

/**
 * Sağlayıcıdan bağımsız dosya depolama sözleşmesi. Bugün S3 uyumlu bir
 * implementasyon (AWS S3, Cloudflare R2, Backblaze B2, MinIO) kullanılır;
 * ileride farklı bir sağlayıcı eklenirse yalnızca bu arayüzü uygulayan yeni
 * bir provider yazılır, tüketen kod değişmez.
 */
export interface StorageProvider {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** İndirme/erişim için süreli, imzalı URL üretir (private bucket varsayımıyla). */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Health check için minimal bağlantı doğrulaması. */
  ping(): Promise<void>;
}
