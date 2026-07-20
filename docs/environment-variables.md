# Environment Variables

Kaynak: [.env.example](../.env.example). Uygulama başlarken (`apps/api/src/config/env.validation.ts`)
bu değişkenler Zod ile doğrulanır; eksik/hatalı bir değer varsa API, hangi alanın sorunlu
olduğunu açıkça belirten bir hata ile **başlamayı reddeder**. Gizli değerler hata mesajında gösterilmez.

## Tüm Değişkenler

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `NODE_ENV` | Hayır | `development` | `development` \| `test` \| `staging` \| `production` |
| `WEB_PORT` | Hayır | `3000` | Web dev server portu (yalnızca lokal) |
| `API_PORT` | Hayır | `4000` | API portu |
| `WEB_URL` | Evet | — | Frontend'in erişilebilir olduğu tam URL |
| `API_URL` | Evet | — | API'nin erişilebilir olduğu tam URL |
| `VITE_API_URL` | Evet (web build) | — | Frontend'in API base URL'i (build-time). Production'da `/api/v1` |
| `DATABASE_URL` | Evet | — | Neon pooler bağlantısı (runtime). `?sslmode=require` zorunlu |
| `DIRECT_URL` | Evet | — | Neon direct bağlantısı (prisma migrate). `?sslmode=require` zorunlu |
| `JWT_ACCESS_SECRET` | Evet | — | Min. 32 karakter, rastgele |
| `JWT_REFRESH_SECRET` | Evet | — | Min. 32 karakter, `JWT_ACCESS_SECRET`'ten farklı |
| `JWT_ACCESS_EXPIRES_IN` | Hayır | `15m` | Access token ömrü |
| `JWT_REFRESH_EXPIRES_IN` | Hayır | `30d` | Refresh token ömrü |
| `COOKIE_SECRET` | Evet | — | Min. 32 karakter, cookie imzalama |
| `STORAGE_PROVIDER` | Hayır | `s3` | Şimdilik yalnızca `s3` |
| `R2_ENDPOINT` | Evet | — | R2 S3 endpoint'i (`https://<account>.r2.cloudflarestorage.com`) |
| `R2_REGION` | Hayır | `auto` | R2 için her zaman `auto` |
| `R2_BUCKET` | Evet | — | Bucket adı (private olmalı) |
| `R2_ACCESS_KEY_ID` | Evet | — | R2 API Token access key |
| `R2_SECRET_ACCESS_KEY` | Evet | — | R2 API Token secret key |
| `R2_FORCE_PATH_STYLE` | Hayır | `false` | MinIO gibi path-style gerektiren sağlayıcılar için `true` |
| `R2_SIGNED_URL_TTL_SECONDS` | Hayır | `900` | Presigned URL geçerlilik süresi (saniye) |
| `CORS_ORIGINS` | Evet | — | Virgülle ayrılmış izinli origin listesi |
| `RATE_LIMIT_TTL_MS` | Hayır | `60000` | Global rate limit penceresi (ms) |
| `RATE_LIMIT_MAX` | Hayır | `100` | Pencere başına istek limiti |
| `AUTH_RATE_LIMIT_MAX` | Hayır | `5` | `/auth/login` için özel limit |
| `LOG_LEVEL` | Hayır | `info` | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Hayır | — | E-posta bildirimleri |
| `SENTRY_DSN` | Hayır | — | Hata izleme |

## Gizli Değişkenler (Northflank Secret Group'ta Tutulacaklar)

```
DATABASE_URL
DIRECT_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
COOKIE_SECRET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

## Ortamlar Arası Ayrım

| Ortam | `NODE_ENV` | `DATABASE_URL` | `R2_ENDPOINT` | Notlar |
|---|---|---|---|---|
| Development | `development` | docker-compose postgres | MinIO (localhost:9000) | `.env` ile |
| Test | `test` | test DB veya mock | Mock | CI pipeline |
| Staging | `staging` | Neon staging branch | R2 staging bucket | Northflank staging proje |
| Production | `production` | Neon main branch | R2 production bucket | Northflank prod proje |

## Secret Üretme

```bash
bash scripts/generate-secrets.sh
```

Bu script `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` ve `COOKIE_SECRET` için güvenli değerler üretir.
