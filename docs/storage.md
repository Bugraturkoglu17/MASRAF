# Dosya Depolama

## Soyutlama

`apps/api/src/storage/storage.interface.ts` içindeki `StorageProvider` arayüzü, iş
kodunun hiçbir sağlayıcıya doğrudan bağımlı olmamasını sağlar:

```ts
interface StorageProvider {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  ping(): Promise<void>;
}
```

Bugünkü implementasyon (`S3StorageProvider`), AWS SDK v3'ü `endpoint` override ile
kullanır — bu sayede aynı kod şu sağlayıcılarla çalışır:

- Amazon S3
- Cloudflare R2
- Backblaze B2
- MinIO (lokal geliştirme)
- Diğer S3 uyumlu sağlayıcılar

Sağlayıcı değiştirmek için yalnızca `.env` içindeki `S3_*` değişkenleri güncellenir;
kod değişikliği gerekmez. Farklı bir protokol (ör. Azure Blob) gerekirse yeni bir sınıf
`StorageProvider`'ı implemente eder ve `storage.module.ts` içinde `useClass` değişir.

## Güvenlik önlemleri

| Önlem | Uygulama |
| --- | --- |
| Dosya türü kontrolü | `ALLOWED_MIME_TYPES` allowlist (`file-validation.ts`) — yalnızca jpeg/png/webp/heic/pdf |
| Maksimum dosya boyutu | 15 MB (`MAX_ATTACHMENT_SIZE_BYTES`), hem Multer limitinde hem servis katmanında |
| Zararlı uzantı kontrolü | `BLOCKED_EXTENSIONS` (`.exe`, `.bat`, `.js`, `.dll`, ...) |
| Rastgele/tahmin edilemez dosya adı | `generateStorageKey`: `crypto.randomBytes(24)` tabanlı anahtar, orijinal ad saklanmaz |
| Dosya hash'i | Yükleme sırasında SHA-256 hesaplanır, `Attachment.sha256` alanında tutulur |
| Kullanıcı yetkisi kontrolü | `AttachmentsService`, masrafın sahibi olmayan kullanıcının yükleme/indirme yapmasını engeller |
| Süreli signed URL | İndirme yalnızca `getSignedUrl` (varsayılan 300 sn) ile; kalıcı public link yoktur |
| Private bucket | Bucket public-read olarak yapılandırılmamalıdır (bkz. aşağıdaki sağlayıcı notları) |
| Metadata kaydı | `Attachment` tablosu: `fileKey`, `fileName`, `mimeType`, `sizeBytes`, `sha256`, `uploadedById` |

## Lokal geliştirme: MinIO

`docker-compose.yml` içindeki `minio` ve `minio-init` servisleri, S3 uyumlu bir ortamı
tek komutla ayağa kaldırır ve `S3_BUCKET` değerindeki bucket'ı otomatik oluşturur:

```bash
docker compose up -d minio minio-init
```

MinIO konsolu: http://localhost:9001

## Production sağlayıcı önerisi

Küçük/orta ölçek için **Cloudflare R2** (egress ücretsiz) veya **Backblaze B2**
maliyet açısından avantajlıdır; AWS ekosistemiyle tam uyumluluk gerekiyorsa **AWS S3**
tercih edilebilir. Hangisi seçilirse seçilsin:

1. Bucket **private** olmalı (public read kapalı).
2. CORS yalnızca `WEB_URL`'e izin verecek şekilde daraltılmalı (doğrudan tarayıcıdan
   upload yapılacaksa; bu sürümde upload backend üzerinden proxy'lenir, bu yüzden CORS
   riski daha düşüktür).
3. Erişim anahtarı yalnızca ilgili bucket'a `PutObject`/`GetObject`/`DeleteObject`
   yetkisiyle sınırlandırılmalı (least privilege).
