# Altyapı Kontrol Listesi

Aşama 1 tamamlanmadan bir sonraki aşamaya geçilmemelidir.

## Kod Tabanı

- [x] `apps/api/src/storage/storage.interface.ts` — StorageProvider arayüzü
- [x] `apps/api/src/storage/providers/r2.adapter.ts` — R2 uygulaması
- [x] `apps/api/src/storage/storage.service.ts` — İş mantığı katmanı
- [x] `apps/api/src/storage/storage.module.ts` — NestJS modülü
- [x] `apps/api/src/config/env.validation.ts` — DIRECT_URL, R2_* değişkenleri eklendi
- [x] `apps/api/src/config/configuration.ts` — R2 ve signedUrlTtl yapılandırması
- [x] `apps/api/prisma/schema.prisma` — `directUrl` eklendi
- [x] `.env.example` — Tüm değişkenler açıklamalı, gerçek değer yok
- [x] `apps/api/Dockerfile` — Multi-stage, non-root, production-ready
- [x] `apps/web/Dockerfile` — Multi-stage, Nginx, non-root, production-ready
- [x] `infrastructure/nginx/web.conf` — `/api` proxy, güvenlik başlıkları, SPA fallback
- [x] `docker-compose.yml` — MinIO lokal geliştirme, R2 env adları güncellendi

## Testler

- [x] `apps/api/src/storage/providers/__tests__/r2.adapter.spec.ts`
- [x] `apps/api/src/health/__tests__/health.controller.spec.ts`

## Dokümantasyon

- [x] `docs/neon-setup.md`
- [x] `docs/cloudflare-r2-setup.md`
- [x] `docs/northflank-secrets.md`
- [x] `docs/northflank-setup.md` (önceden vardı, güncellendi)
- [x] `docs/infrastructure-architecture.md`
- [x] `docs/environment-variables.md` (önceden vardı, güncellendi)
- [x] `scripts/generate-secrets.sh`

## Manuel Yapılacaklar (Siz)

Aşağıdaki işlemler panellerde sizin yapmanız gereken adımlardır:

### Neon

- [ ] Neon hesabı oluştur: [console.neon.tech](https://console.neon.tech)
- [ ] Proje oluştur: `masraf-yonetim-sistemi`
- [ ] Veritabanı adını `masraf` olarak ayarla
- [ ] `DATABASE_URL` (pooler) bağlantı adresini kopyala
- [ ] `DIRECT_URL` (direct) bağlantı adresini kopyala
- [ ] Her ikisini Northflank Secret Group'a ekle

### Cloudflare R2

- [ ] Cloudflare hesabına R2 ekle
- [ ] Private bucket oluştur: `masraf-attachments`
- [ ] Bucket-specific API Token oluştur (Read + Write)
- [ ] `R2_ACCESS_KEY_ID` ve `R2_SECRET_ACCESS_KEY` kopyala
- [ ] Northflank Secret Group'a ekle
- [ ] CORS yapılandırmasını yap (production domain ile)

### Northflank

- [ ] GitLab hesabını Northflank'e bağla
- [ ] Proje oluştur: `masraf-yonetim-sistemi`
- [ ] Secret Group oluştur: `masraf-api-secrets`
- [ ] Secret'ları ekle (7 adet: DATABASE_URL, DIRECT_URL, JWT_x2, COOKIE_SECRET, R2_x2)
- [ ] `masraf-api` servisi oluştur
  - Dockerfile: `apps/api/Dockerfile`, context: repo kökü
  - Port: 4000 (internal)
  - Secret Group: `masraf-api-secrets` bağla
  - Non-secret env'leri ekle
  - Health check: `/health/ready` (readiness), `/health/live` (liveness)
- [ ] `masraf-web` servisi oluştur
  - Dockerfile: `apps/web/Dockerfile`, context: repo kökü
  - Build arg: `VITE_API_URL=/api/v1`
  - Port: 8080 (public)
  - Health check: `/` 
- [ ] Migration Job oluştur (opsiyonel, ilk deploy öncesi)
- [ ] `main` branch'e push yap, ilk deploy'u tetikle

## Doğrulama Kontrolleri (Deploy Sonrası)

- [ ] `GET https://<web-domain>/` → React uygulaması açılıyor
- [ ] `GET https://<web-domain>/health/live` → `{ "status": "ok" }`
- [ ] `GET https://<web-domain>/health/ready` → `{ "status": "ok", "info": { "database": ... } }`
- [ ] Log'larda connection string veya secret değerleri görünmüyor
- [ ] R2 bucket'a yetkisiz erişim denenince reddediliyor
- [ ] `/api` istekleri Nginx tarafından API servisine proxy ediliyor
