# Cloudflare R2 Kurulumu

> Bu belge Cloudflare panelinde sizin uygulamanız gereken adımları listeler.
> API anahtarlarını bu belgeye yazmayın.

## Mimari Kararlar

- Bucket **private**'tır; public erişim kapalıdır.
- Dosyalara yalnızca backend tarafından üretilen **kısa ömürlü imzalı URL** (presigned URL) ile erişilir.
- R2 erişim anahtarları yalnızca backend'de tutulur; frontend'e gönderilmez.
- Dosya binary verisi veritabanında tutulmaz; yalnızca `fileKey`, metadata ve SHA-256 saklanır.
- Object key formatı: `{organizationId}/{uuid}` — tahmin edilemez ve çakışmasızdır.

## 1. Bucket Oluşturma

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Sol menü → **R2 Object Storage**
2. **Create bucket**
3. Ad: `masraf-attachments` (veya tercih ettiğiniz ad)
4. Bölge: Uygulamanıza yakın (Northflank datacenter'ı ile aynı bölge önerilir)
5. Oluşturduktan sonra **Settings** → **Public Access** → **OFF** (varsayılan; kesinlikle değiştirmeyin)

## 2. API Token Oluşturma

Bucket başına ayrı token oluşturun (en az ayrıcalık prensibi):

1. Cloudflare Dashboard → **R2 Object Storage** → **Manage R2 API Tokens**
2. **Create API Token**
3. Ayarlar:
   - Token Name: `masraf-api-token`
   - Permissions: **Object Read & Write** (Admin değil)
   - **Specify bucket**: `masraf-attachments` (bucket başına izin — kritik!)
   - TTL: Belirsiz (uzun ömürlü; Northflank secret olarak saklanır)
4. Oluşturulan değerleri kopyalayın:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (yalnızca bir kez gösterilir)

## 3. Endpoint Bilgisini Alma

- Bucket oluşturduktan sonra **Settings** sekmesinde görüntülenebilir
- Veya: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Account ID: Cloudflare Dashboard → sağ üst menü → **Account ID**

```
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

## 4. CORS Yapılandırması

Tarayıcıdan doğrudan R2'ye yükleme (presigned PUT) yapılacaksa CORS gereklidir.

Bucket → **Settings** → **CORS Policy** → Aşağıdaki yapılandırmayı ekleyin:

```json
[
  {
    "AllowedOrigins": ["https://app.<domaininiz>"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-date", "Authorization"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Notlar:**
- `AllowedOrigins` production'da gerçek domain'inizi içermeli; `*` kullanmayın.
- Lokal geliştirme için `http://localhost:3000` eklenebilir.
- `PUT` izni presigned upload için gereklidir.
- `GET` izni presigned download için gereklidir (ancak bucket private olduğu için imzalı URL zorunludur).

## 5. Environment Variables

```env
STORAGE_PROVIDER=s3
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=masraf-attachments
R2_ACCESS_KEY_ID=<token'dan kopyalanan>
R2_SECRET_ACCESS_KEY=<token'dan kopyalanan>
R2_FORCE_PATH_STYLE=false
R2_SIGNED_URL_TTL_SECONDS=900
```

## 6. Presigned URL Akışı

### İndirme (Download)

```
Client → GET /api/v1/attachments/:id/url
       ← Backend: { url: "https://....r2.cloudflarestorage.com/...?X-Amz-Signature=..." }
Client → GET <presigned_url>  (doğrudan R2'ye, TTL: 900 saniye)
```

### Yükleme (Upload) — İleride

```
Client → POST /api/v1/attachments/presign { mimeType, fileName }
       ← Backend: { fileKey, uploadUrl }
Client → PUT <uploadUrl> [dosya binary] (doğrudan R2'ye)
Client → POST /api/v1/attachments/confirm { fileKey, expenseId }  (backend doğrular)
```

## 7. Lokal Geliştirme

Lokal geliştirmede MinIO (S3 uyumlu) kullanılır; `docker-compose.yml` ile otomatik başlar.

```env
R2_ENDPOINT=http://localhost:9000
R2_REGION=auto
R2_BUCKET=masraf-attachments
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
R2_FORCE_PATH_STYLE=true
```

MinIO Konsol: http://localhost:9001 (minioadmin/minioadmin)
