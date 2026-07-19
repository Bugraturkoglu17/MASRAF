# Environment Variables

Kaynak: [.env.example](../.env.example). Uygulama başlarken (`apps/api/src/config/env.validation.ts`)
bu değişkenler Zod ile doğrulanır; eksik/hatalı bir değer varsa API, hangi alanın sorunlu
olduğunu açıkça belirten bir hata ile **başlamayı reddeder**.

| Değişken | Zorunlu | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `NODE_ENV` | Hayır | `development` | `development` \| `test` \| `staging` \| `production` |
| `WEB_PORT` | Hayır | `3000` | Web dev server portu |
| `API_PORT` | Hayır | `4000` | API portu |
| `WEB_URL` | Evet | - | Frontend'in erişilebilir olduğu tam URL |
| `API_URL` | Evet | - | API'nin erişilebilir olduğu tam URL |
| `VITE_API_URL` | Evet (web build) | - | Frontend'in çağıracağı API base URL'i (build-time gömülür) |
| `DATABASE_URL` | Evet | - | PostgreSQL bağlantı dizesi |
| `JWT_ACCESS_SECRET` | Evet | - | Min. 32 karakter, rastgele |
| `JWT_REFRESH_SECRET` | Evet | - | Min. 32 karakter, rastgele, `JWT_ACCESS_SECRET`'ten farklı |
| `JWT_ACCESS_EXPIRES_IN` | Hayır | `15m` | Access token ömrü |
| `JWT_REFRESH_EXPIRES_IN` | Hayır | `30d` | Refresh token ömrü |
| `COOKIE_SECRET` | Evet | - | Min. 32 karakter, cookie imzalama |
| `STORAGE_PROVIDER` | Hayır | `s3` | Şimdilik yalnızca `s3` desteklenir |
| `S3_ENDPOINT` | Evet | - | S3 uyumlu sağlayıcı endpoint'i |
| `S3_REGION` | Hayır | `auto` | Bölge (R2/B2 için genelde `auto`) |
| `S3_BUCKET` | Evet | - | Bucket adı (private olmalı) |
| `S3_ACCESS_KEY_ID` | Evet | - | Erişim anahtarı |
| `S3_SECRET_ACCESS_KEY` | Evet | - | Gizli anahtar |
| `S3_FORCE_PATH_STYLE` | Hayır | `false` | MinIO gibi path-style gerektiren sağlayıcılar için `true` |
| `S3_PUBLIC_URL` | Hayır | - | CDN önü varsa genel URL (opsiyonel) |
| `CORS_ORIGINS` | Evet | - | Virgülle ayrılmış izinli origin listesi |
| `RATE_LIMIT_TTL_MS` | Hayır | `60000` | Global rate limit penceresi |
| `RATE_LIMIT_MAX` | Hayır | `100` | Pencere başına istek limiti |
| `AUTH_RATE_LIMIT_MAX` | Hayır | `5` | `/auth/login` için özel limit |
| `LOG_LEVEL` | Hayır | `info` | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Hayır | - | Gelecekte e-posta bildirimleri için |
| `SENTRY_DSN` | Hayır | - | Hata izleme (opsiyonel) |

## Ortamlar arası ayrım

| Ortam | `NODE_ENV` | Notlar |
| --- | --- | --- |
| Development | `development` | Lokal `.env`, `docker-compose.yml` (Postgres + MinIO) |
| Test | `test` | CI'daki `masraf_test` veritabanı, ayrı secret değerleri |
| Staging | `staging` | Northflank'te ayrı proje/servis, production'a benzer ama gerçek olmayan veri |
| Production | `production` | Gerçek secret'lar yalnızca Northflank Secret Groups / GitLab masked variables içinde |

Her ortamın **kendi** `JWT_*`, `COOKIE_SECRET` ve S3 kimlik bilgileri olmalı; hiçbir
zaman aynı secret iki ortamda paylaşılmamalıdır.
