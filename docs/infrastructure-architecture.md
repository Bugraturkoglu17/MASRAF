# Altyapı Mimarisi

## Genel Bakış

```
┌─────────────────────────────────────────────────────────────┐
│                        İnternet                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                ┌───────────▼────────────┐
                │  Northflank CDN / LB   │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │  masraf-web (Nginx)    │  Port 8080
                │  React PWA + proxy     │
                └───────┬───────┬────────┘
                        │/api/  │/*
                   proxy│       │static files
                        │       │(React SPA)
                ┌───────▼───────┐
                │  masraf-api   │  Port 4000 (internal)
                │  NestJS API   │
                └──────┬────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
┌─────────▼──┐  ┌──────▼──────┐   │
│   Neon     │  │ Cloudflare  │   │
│ PostgreSQL │  │     R2      │   │
│ (pooler)   │  │  (private)  │   │
└────────────┘  └─────────────┘   │
                                  │
                          (gelecekte)
                          Redis, vb.
```

## Servisler

### masraf-web (Public HTTP)

| Özellik | Değer |
|---|---|
| Image | `apps/web/Dockerfile` |
| Port | 8080 |
| Erişim | Public (internet'ten erişilebilir) |
| Görev | React PWA sunmak + `/api` isteklerini proxy etmek |

**Nginx davranışı:**
- `GET /assets/*` → önbelleklenmiş statik dosyalar (hash'li, immutable)
- `GET /api/*` → `http://masraf-api:4000` (iç ağ proxy)
- `GET /health*` → `http://masraf-api:4000` (health probe)
- `GET /*` → `index.html` (SPA fallback)

### masraf-api (Internal HTTP)

| Özellik | Değer |
|---|---|
| Image | `apps/api/Dockerfile` |
| Port | 4000 |
| Erişim | Internal (yalnızca Northflank iç ağı) |
| Görev | REST API, iş mantığı, veritabanı işlemleri |

### Neon PostgreSQL

- Bağlantı türü: Pooler (PgBouncer, transaction mode) — runtime
- Bağlantı türü: Direct — migration
- SSL: Zorunlu (`sslmode=require`)
- Multi-tenant izolasyonu: `organizationId` sütunu ile (veritabanı değil, şema düzeyinde)

### Cloudflare R2

- Erişim: Private bucket, presigned URL ile
- Dosya key'i: `{organizationId}/{uuid}` formatı
- Binary veri: Veritabanında tutulmaz, yalnızca key ve metadata saklanır
- İmzalı URL TTL: 900 saniye (yapılandırılabilir)

## Veri Akışı

### Kimlik Doğrulama

```
POST /api/v1/auth/login
  → NestJS AuthModule → Prisma → Neon DB
  ← access_token (Bearer, 15m) + refresh cookie (HttpOnly, 30d)
```

### Masraf Oluşturma

```
POST /api/v1/expenses
  Authorization: Bearer <token>
  → JwtAuthGuard → PermissionsGuard → ExpensesService → Prisma → Neon DB
  ← { id, status: "DRAFT", ... }
```

### Dosya Yükleme

```
POST /api/v1/attachments/expenses/:id   (multipart/form-data)
  → AttachmentsService → StorageService → R2Adapter → Cloudflare R2
  → Prisma (metadata kaydet) → Neon DB
  ← { id, fileKey, fileName, ... }

GET /api/v1/attachments/:id/url
  → StorageService.getSignedDownloadUrl(fileKey) → R2Adapter → presigned URL (900s)
  ← { url: "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=..." }
```

## Northflank Topolojisi

```
Northflank Proje: masraf-yonetim-sistemi
├── masraf-web     ← Public HTTP, Port 8080
│   └── Secret Group: (yok — yalnızca VITE_API_URL build arg)
└── masraf-api     ← Internal HTTP, Port 4000
    └── Secret Group: masraf-api-secrets
        ├── DATABASE_URL
        ├── DIRECT_URL
        ├── JWT_ACCESS_SECRET
        ├── JWT_REFRESH_SECRET
        ├── COOKIE_SECRET
        ├── R2_ACCESS_KEY_ID
        └── R2_SECRET_ACCESS_KEY
```

## VITE_API_URL Stratejisi

Production'da `VITE_API_URL=/api/v1` (relative) ayarlanır.
Tarayıcı `GET /api/v1/expenses` isteği atar → Nginx masraf-web üzerinde yakalar →
`http://masraf-api:4000/api/v1/expenses`'e proxy eder.

**Avantajlar:**
- API servisi için ayrı public domain gerekmez (maliyet tasarrufu)
- Frontend'de API adresi hardcode edilmez
- Northflank iç ağ gizliliği korunur

**Dezavantaj:**
- API'ye doğrudan dışarıdan erişim gerekirken (mobile app, 3rd party) ayrı public domain gerekir
