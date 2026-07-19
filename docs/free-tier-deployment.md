# Ücretsiz Katman ile Deployment (Neon + Cloudflare R2 + Render)

Northflank'in ücretsiz katmanı yoktur (en ucuz kaynak kombinasyonu ~$30-36/ay). Bu belge,
tamamen **$0/ay** ile çalışan bir alternatifi anlatır. Mimari platformdan bağımsız
tasarlandığı için (bkz. [architecture.md](architecture.md)) kodda hiçbir değişiklik
gerekmez — yalnızca ortam değişkenleri farklı sağlayıcılara işaret eder.

## Sınırlar (bilerek kabul edilen ödünleşimler)

- **Render ücretsiz web servisleri** 15 dakika hareketsizlikte "uyur"; sonraki istekte
  ~1 dakika uyanma gecikmesi olur. Sürekli/production trafiği için uygun değildir,
  geliştirme/demo/erken kullanıcı aşaması için uygundur.
- **Neon ücretsiz plan**: 0.5 GB depolama, proje başına 100 CU-saat/ay, otomatik
  scale-to-zero.
- **Cloudflare R2 ücretsiz plan**: 10 GB depolama, ayda 1M Class A + 10M Class B işlem,
  $0 egress ücreti.

Hiçbiri kart bilgisi olmadan hesap açmayı engellemez (Neon ve Render kart istemez;
Cloudflare hesabı da ücretsizdir, yalnızca R2'yi *etkinleştirmek* için bazı hesaplarda
kart doğrulaması istenebilir — R2 kullanımı ücretsiz sınırlar içinde kaldığı sürece
ücret yansımaz).

## 1) Neon (PostgreSQL)

1. https://console.neon.tech adresinden GitHub ile (veya e-posta ile) ücretsiz hesap açın.
2. **New Project** → proje adı: `masraf-sunucu` → bölge: size yakın bir bölge (ör.
   `AWS us-east-2` veya `AWS eu-central-1`) → PostgreSQL sürümü: 16.
3. Proje oluşunca gösterilen **Connection string**'i kopyalayın; şuna benzer:
   `postgresql://<kullanici>:<sifre>@<host>.neon.tech/<db>?sslmode=require`
4. Bu değeri `DATABASE_URL` olarak saklayın (Render'da env variable olarak
   kullanılacak — bkz. adım 3).

## 2) Cloudflare R2 (dosya depolama)

1. https://dash.cloudflare.com adresinden ücretsiz hesap açın.
2. Sol menüden **R2 Object Storage** → **Create bucket** → ad: `masraf-attachments`
   → Location: Automatic.
3. **Manage R2 API Tokens** → **Create API Token** → izin: *Object Read & Write*,
   yalnızca `masraf-attachments` bucket'ına kapsamlandırın.
4. Oluşturulan bilgileri not edin:
   - `S3_ACCESS_KEY_ID` = Access Key ID
   - `S3_SECRET_ACCESS_KEY` = Secret Access Key
   - `S3_ENDPOINT` = `https://<hesap-id>.r2.cloudflarestorage.com`
   - `S3_BUCKET` = `masraf-attachments`
   - `S3_REGION` = `auto`
   - `S3_FORCE_PATH_STYLE` = `true`

## 3) Render (api ve web servisleri)

1. https://dashboard.render.com adresinden GitLab hesabınızla (veya e-posta ile)
   ücretsiz hesap açın.
2. GitLab entegrasyonunu bağlayın: **Account Settings → Connected Accounts → GitLab**
   → `bugraturkoglu441/masraf-sunucu` reposuna erişim izni verin.
3. **New → Web Service** → reposu seçin → aşağıdaki ayarlarla `api` servisini oluşturun:

   | Ayar | Değer |
   | --- | --- |
   | Name | `masraf-api` |
   | Region | Neon ile aynı bölgeye yakın |
   | Branch | `main` |
   | Runtime | Docker |
   | Dockerfile Path | `apps/api/Dockerfile` |
   | Docker Build Context | `.` (repo kökü) |
   | Instance Type | Free |

   **Environment** sekmesinde şu değişkenleri ekleyin (gerçek, güçlü rastgele
   değerlerle — `openssl rand -base64 48`):

   ```
   NODE_ENV=production
   API_PORT=4000
   WEB_URL=https://<web-servisiniz>.onrender.com
   API_URL=https://<api-servisiniz>.onrender.com
   DATABASE_URL=<Neon connection string>
   JWT_ACCESS_SECRET=<rastgele, min 32 karakter>
   JWT_REFRESH_SECRET=<rastgele, min 32 karakter>
   COOKIE_SECRET=<rastgele, min 32 karakter>
   STORAGE_PROVIDER=s3
   S3_ENDPOINT=<Cloudflare R2 endpoint>
   S3_REGION=auto
   S3_BUCKET=masraf-attachments
   S3_ACCESS_KEY_ID=<R2 access key>
   S3_SECRET_ACCESS_KEY=<R2 secret key>
   S3_FORCE_PATH_STYLE=true
   CORS_ORIGINS=https://<web-servisiniz>.onrender.com
   ```

4. **New → Web Service** → aynı repo → `web` servisi:

   | Ayar | Değer |
   | --- | --- |
   | Name | `masraf-web` |
   | Runtime | Docker |
   | Dockerfile Path | `apps/web/Dockerfile` |
   | Docker Build Context | `.` |
   | Docker Build Args | `VITE_API_URL=https://<api-servisiniz>.onrender.com/api/v1` |
   | Instance Type | Free |

5. İlk deploy tamamlandıktan sonra, Render'ın **Shell** sekmesinden `api` servisinde
   migration'ı çalıştırın (tek seferlik):

   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

   (Render Free planında Shell erişimi kısıtlı olabilir; bu durumda Neon'un SQL
   Editor'ünden `apps/api/prisma/migrations` altındaki SQL dosyalarını sırayla elle
   çalıştırabilir, ya da lokalinizden `DATABASE_URL`'i Neon'a işaret ederek
   `pnpm db:deploy` komutunu çalıştırabilirsiniz — bu, aynı ağ üzerinden herhangi bir
   yerden çalışır.)

## 4) Doğrulama

- `https://<api-servisiniz>.onrender.com/health/ready` → `{"status":"ok",...}` dönmeli.
- `https://<web-servisiniz>.onrender.com` → giriş ekranı açılmalı.
- `pnpm db:seed` ile oluşturulan `owner@demo.local` / `ChangeMe123!` hesabıyla giriş
  test edilebilir (yalnızca demo/development amaçlı).

## Northflank'e geçiş

İleride ölçeklenme gerekirse (Render'ın uyuma davranışı sorun olursa), aynı Docker
image'ları [northflank-setup.md](northflank-setup.md) rehberiyle Northflank'e taşınabilir
— kod değişmez, yalnızca ortam değişkenleri ve build ayarları platforma göre yeniden
girilir.
