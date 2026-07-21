# Masraf Yönetim Sistemi

Şirket içi masraf oluşturma, onay ve takip süreçlerini yönetmek için geliştirilen, çok
kiracılı (multi-tenant) mimariye açık, TypeScript tabanlı bir monorepo.

Bu sürüm production sertleştirmesi uygulanmış bir **release candidate**'tır. Kimlik
doğrulama, temel rol/organizasyon koruması, masraf akışı, private dosya depolama,
bildirim merkezi, PWA, health, Docker ve GitLab CI/CD altyapısı vardır. Raporlama,
ayrıntılı permission override ve bazı admin/kabul akışları eksik olduğundan proje henüz
production kabulü almamıştır; bkz. [docs/known-limitations.md](docs/known-limitations.md).

## İçindekiler

- [Mimari Özeti](#mimari-özeti)
- [Teknoloji Listesi](#teknoloji-listesi)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Environment Variables](#environment-variables)
- [Development Çalıştırma](#development-çalıştırma)
- [Docker ile Çalıştırma](#docker-ile-çalıştırma)
- [Veritabanı Migration](#veritabanı-migration)
- [Seed](#seed)
- [Test](#test)
- [Lint / Typecheck](#lint--typecheck)
- [Build](#build)
- [Swagger](#swagger)
- [PWA Testi](#pwa-testi)
- [GitLab Kullanımı](#gitlab-kullanımı)
- [Northflank Deployment](#northflank-deployment)
- [Dosya Depolama](#dosya-depolama)
- [Güvenlik Notları](#güvenlik-notları)
- [Sorun Giderme](#sorun-giderme)
- [Klasör Yapısı](#klasör-yapısı)
- [Gelecek Geliştirmeler](#gelecek-geliştirmeler)

## Mimari Özeti

```
Kullanıcı → PWA Frontend (React) → REST API (NestJS) → PostgreSQL (Prisma)
                                                       → S3 uyumlu depolama
```

Detaylı mimari kararlar ve diyagramlar için [docs/architecture.md](docs/architecture.md).

## Teknoloji Listesi

| Katman | Teknoloji |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | React 18 + Vite + TypeScript, vite-plugin-pwa |
| Backend | NestJS 10 + TypeScript |
| Veritabanı | PostgreSQL 16 + Prisma ORM |
| API dokümantasyonu | Swagger / OpenAPI |
| Frontend veri yönetimi | TanStack Query |
| Form | React Hook Form + Zod |
| Test | Vitest (web), Jest + Supertest (api) |
| Kod kalitesi | ESLint 9 (flat config), Prettier, TypeScript strict |
| Konteyner | Docker (multi-stage), Docker Compose |
| Depolama | S3 uyumlu (AWS S3 / Cloudflare R2 / Backblaze B2 / MinIO) |
| Loglama | nestjs-pino (yapılandırılmış JSON) |
| Kimlik doğrulama | JWT access + refresh token rotasyonu |

## Gereksinimler

- Node.js >= 22
- pnpm >= 9 (`corepack enable` ile gelir)
- Docker + Docker Compose (lokal PostgreSQL/MinIO için)

## Kurulum

```bash
git clone <GITLAB_REPOSITORY_URL>
cd masraf-sunucu
cp .env.example .env
pnpm install
```

`.env` dosyasındaki `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` ve `COOKIE_SECRET`
değerlerini en az 32 karakterlik rastgele değerlerle değiştirin:

```bash
openssl rand -base64 48
```

## Environment Variables

Tüm değişkenler [docs/environment-variables.md](docs/environment-variables.md) içinde
açıklanmıştır. Kaynak dosya: [.env.example](.env.example).

## Development Çalıştırma

PostgreSQL ve MinIO'yu Docker ile ayağa kaldırıp API/web'i lokalde çalıştırmak en hızlı yol:

```bash
docker compose up -d postgres minio minio-init
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/docs
- MinIO konsolu: http://localhost:9001 (kullanıcı/şifre: `.env` içindeki `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`)

## Docker ile Çalıştırma

```bash
docker compose up --build
docker compose down
```

Üretime yakın bir çalıştırma için:

```bash
docker compose -f docker-compose.production.yml up --build
```

## Veritabanı Migration

```bash
pnpm db:generate   # Prisma client üret
pnpm db:migrate    # development migration oluştur/uygula
pnpm db:deploy     # production'da bekleyen migration'ları uygula (yalnızca deploy)
pnpm db:studio     # Prisma Studio
```

Production'da migration'ın ne zaman çalıştırılacağı için
[docs/deployment.md](docs/deployment.md#migration-stratejisi).

## Seed

```bash
pnpm db:seed
```

Demo organizasyon, roller/izinler ve `owner@demo.local` / `ChangeMe123!` kullanıcısı
oluşturur. **Yalnızca development/staging için kullanın.**

## Test

```bash
pnpm test          # tüm workspace'lerde unit test
pnpm test:cov       # coverage ile
pnpm --filter @masraf/api test:e2e   # API e2e (gerçek PostgreSQL/MinIO gerektirir)
```

Test veritabanı `docker-compose.yml` / CI pipeline'ında ayrı bir veritabanı adıyla
(`masraf_test`) production'dan tamamen izole tutulur.

## Lint / Typecheck

```bash
pnpm lint
pnpm typecheck
```

## Build

```bash
pnpm build
```

## Swagger

API ayaktayken development ortamında: http://localhost:4000/api/docs. Production'da kapalıdır.

## PWA Testi

1. `pnpm build && pnpm --filter @masraf/web preview` (PWA özellikleri yalnızca prod
   build'te aktiftir; `pnpm dev` sırasında service worker devre dışıdır).
2. Chrome DevTools → Application → Manifest ve Service Workers sekmelerinden kaydı
   doğrulayın.
3. Network sekmesinden "Offline" seçeneğini işaretleyip sayfayı yenileyerek
   `offline.html` yedek sayfasını görün.
4. Yeni bir build ile service worker güncellemesi tetiklendiğinde uygulama içi
   "Güncelle" bildirimini test edin.

## GitLab Kullanımı

```bash
git remote add gitlab <GITLAB_REPOSITORY_URL>
git add .
git commit -m "chore: initialize expense management application architecture"
git push -u origin main
```

Pipeline: [.gitlab-ci.yml](.gitlab-ci.yml) — kalite, unit/integration, ayrı web/API build,
security/secret/container scan ve manuel staging/production kapıları. Production adımları:
[docs/production-deployment.md](docs/production-deployment.md).

## Northflank Deployment

Adım adım panel talimatları: [docs/northflank-setup.md](docs/northflank-setup.md).
Northflank'in ücretsiz katmanı yoktur (~$30-36/ay); tamamen ücretsiz bir alternatif için
[docs/free-tier-deployment.md](docs/free-tier-deployment.md) (Neon + Cloudflare R2 + Render).

## Dosya Depolama

Sağlayıcıdan bağımsız `StorageProvider` arayüzü ve güvenlik önlemleri için
[docs/storage.md](docs/storage.md).

## Güvenlik Notları

Özet: JWT access token bellekte (frontend), refresh token httpOnly cookie'de tutulur;
şifreler argon2 ile hash'lenir; RBAC + organizasyon izolasyonu her istekte doğrulanır.
Detaylar: [docs/security.md](docs/security.md).

## Sorun Giderme

| Belirti | Olası neden | Çözüm |
| --- | --- | --- |
| API başlarken "Ortam değişkenleri doğrulaması başarısız" hatası | `.env` eksik/hatalı alan | Hata mesajındaki alan listesini `.env.example` ile karşılaştırın |
| `pnpm db:migrate` bağlantı hatası veriyor | PostgreSQL ayakta değil | `docker compose up -d postgres` |
| Dosya yükleme 500 hatası | MinIO/S3 erişilemiyor | `docker compose up -d minio minio-init`, bucket'ın oluştuğunu doğrulayın |
| `/health/ready` 503 dönüyor | DB veya storage erişilemiyor | Terminus yanıtındaki `details` alanına bakın |
| Frontend'de CORS hatası | `CORS_ORIGINS` frontend adresini içermiyor | `.env` içinde `CORS_ORIGINS` değerini güncelleyin |

## Klasör Yapısı

```text
masraf-sunucu/
├── apps/
│   ├── web/     # React + Vite PWA
│   └── api/     # NestJS REST API
├── packages/
│   ├── shared-types/       # Ortak TypeScript tipleri
│   ├── shared-validation/  # Ortak Zod şemaları
│   ├── eslint-config/      # Paylaşılan ESLint flat config
│   └── tsconfig/           # Paylaşılan tsconfig taban dosyaları
├── infrastructure/
│   └── nginx/   # Web container için nginx yapılandırması
├── docs/        # Teknik dokümantasyon
├── .gitlab-ci.yml
├── docker-compose.yml
├── docker-compose.production.yml
└── .env.example
```

## Gelecek Geliştirmeler

- Masraf oluşturma/onay ekranlarının frontend'e bağlanması (backend uçları hazır)
- Raporlama ve dışa aktarma (CSV/Excel/PDF)
- Departman/rol yönetimi ekranları
- Tam çevrimdışı senkronizasyon (bugün yalnızca uygulama kabuğu önbelleklenir)
- E-posta bildirimleri (SMTP altyapısı `.env` içinde tanımlı, servis entegrasyonu yapılmadı)
- Şifre sıfırlama akışının uçtan uca tamamlanması
- Çoklu onay sırası (bugün tek aşamalı onay/red uygulanmıştır)
