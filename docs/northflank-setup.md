# Northflank Kurulumu (Panelde Uygulanacak Adımlar)

> Bu belge, Northflank panelinde **sizin** uygulamanız gereken adımları listeler. Bu
> oturumda Northflank panelinize erişimim/yetkim olmadığı için hiçbir servis
> oluşturulmadı — aşağıdaki adımları kendiniz uygulamanız gerekir.

Takım: `https://app.northflank.com/t/bugraturk0glus-team`

## 1) Proje oluşturma

1. Northflank → Takımınız → **New Project**
2. Proje adı: `masraf-yonetim-sistemi` (ortam başına ayrı proje önerilir: `-staging`,
   `-production`)

## 2) Build kaynağı seçimi

İki seçenek var:

- **A) Northflank'in GitLab'dan doğrudan build alması** (önerilen — daha az bakım):
  Northflank → Project → **Add Service** → **Deploy from Git Repository** →
  GitLab hesabınızı bağlayın → `bugraturkoglu441/masraf-sunucu` deposunu seçin.
- **B) GitLab CI'ın build ettiği image'ı Northflank'in çekmesi**: `.gitlab-ci.yml`
  içindeki `container:*` job'ları GitLab Container Registry'ye push eder; Northflank
  servisini "External Image" olarak GitLab Container Registry'ye işaret edecek şekilde
  yapılandırırsınız (registry erişim bilgisi Northflank Secret Group'a eklenir).

Bu doküman (A) senaryosunu esas alır; (B) seçilirse yalnızca "Build ayarları" adımı
atlanır.

## 3) Backend servisi (`api`)

| Ayar | Değer |
| --- | --- |
| Servis tipi | Deployment (Combined build + deploy) |
| Repository | `bugraturkoglu441/masraf-sunucu`, branch: `main` |
| Dockerfile yolu | `apps/api/Dockerfile` |
| Build context | Repo kökü (`.`) |
| Internal port | `4000` |
| Public domain | Hayır (yalnızca `web` servisinin arkasından değil — API'nin kendi public domain'i gerekiyorsa: Evet, `api.<domaininiz>` olarak) |
| Health check path | `/health/ready` (readiness), `/health/live` (liveness) — Northflank "Health Checks" sekmesinde her ikisi ayrı ayrı tanımlanabilir |
| Health check portu | `4000` |
| Replika sayısı | Başlangıç için `1` |
| CPU / RAM | Başlangıç için `0.5 vCPU / 512 MB` yeterli, trafiğe göre artırılabilir |

## 4) Frontend servisi (`web`)

| Ayar | Değer |
| --- | --- |
| Servis tipi | Deployment |
| Repository | Aynı repo, branch: `main` |
| Dockerfile yolu | `apps/web/Dockerfile` |
| Build context | Repo kökü (`.`) |
| Build argument | `VITE_API_URL=https://api.<domaininiz>/api/v1` |
| Internal port | `8080` |
| Public domain | Evet — `app.<domaininiz>` |
| Health check path | `/` |
| Health check portu | `8080` |

## 5) PostgreSQL

- Northflank → Project → **Add Addon** → **PostgreSQL** (yönetilen addon) **veya**
  harici bir PostgreSQL (ör. Neon, Supabase, kendi VPS'iniz) kullanabilirsiniz —
  mimari buna bağımlı değildir, tek gereken standart bir `postgresql://` bağlantı
  dizesidir.
- Addon oluşturulunca Northflank otomatik bir `DATABASE_URL` benzeri bağlantı bilgisi
  üretir; bunu **api** servisinin environment variable'ı olarak `DATABASE_URL` adıyla
  ekleyin (aşağıdaki tabloya bakın).

## 6) Environment Variables — hangi servise ne eklenecek

| Değişken | Servis | Kaynak |
| --- | --- | --- |
| `NODE_ENV=production` | api, web (build arg değil, sadece api'de runtime gerekli) | Elle |
| `API_PORT=4000` | api | Elle |
| `WEB_URL` | api | `https://app.<domaininiz>` |
| `API_URL` | api | `https://api.<domaininiz>` |
| `DATABASE_URL` | api | PostgreSQL addon bağlantı bilgisi |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` | api | Secret Group, `openssl rand -base64 48` ile üretilmiş |
| `STORAGE_PROVIDER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | api | Secret Group (seçtiğiniz S3 uyumlu sağlayıcıdan) |
| `CORS_ORIGINS=https://app.<domaininiz>` | api | Elle |
| `RATE_LIMIT_*`, `LOG_LEVEL` | api | Elle (varsayılanlar genelde yeterli) |
| `VITE_API_URL` | web | **Build argument** olarak (Dockerfile `ARG`), runtime env değil |

Gizli değerler (`JWT_*`, `COOKIE_SECRET`, `S3_SECRET_ACCESS_KEY`, `DATABASE_URL`) için
Northflank'te **Secret Groups** kullanın ve yalnızca `api` servisine bağlayın; `web`
servisinin bu değerlere erişimi olmamalıdır.

## 7) Migration çalıştırma

Northflank → Project → **Add Job** (bir kerelik/manuel tetiklenen görev):

- Aynı `apps/api/Dockerfile` image'ını kullanır.
- Komut override: `pnpm --filter @masraf/api db:deploy` (veya derlenmiş image içinde
  `node node_modules/.bin/prisma migrate deploy` — Dockerfile üretim imajı `pnpm`
  içermediği için, migration job'ı için ayrı bir "build" aşamalı image ya da
  `prisma migrate deploy`'u doğrudan `npx prisma migrate deploy` ile çalıştırmanız
  önerilir).
- Aynı `DATABASE_URL` secret'ını bu job'a da bağlayın.
- **Her yeni deploy öncesi bu job'ı elle tetikleyin** (bkz.
  [deployment.md](deployment.md#migration-stratejisi)).

## 8) Automatic Deployment

Northflank → Servis → **Build & Deploy** sekmesinde "Automatic deploys on push"
seçeneğini `main` branch için açabilirsiniz. Önerilen akış: `staging` projesinde
otomatik deploy açık, `production` projesinde **kapalı** (manuel onayla deploy) —
migration job'ının deploy'dan önce çalıştığından emin olmak için.

## 9) Log görüntüleme

Northflank → Servis → **Logs** sekmesi, `nestjs-pino` tarafından üretilen
yapılandırılmış JSON logları gösterir. `requestId` alanına göre filtreleyerek belirli
bir isteği takip edebilirsiniz.

## 10) Rollback

Northflank → Servis → **Deployments** geçmişi → önceki başarılı deployment'ın yanındaki
**Redeploy** butonu. Veritabanı migration'ı geriye dönük uyumsuzsa önce ilgili "down"
migration'ı elle uygulayın.

## 11) Custom domain

Northflank → Servis → **Domains** → **Add Domain** → kendi domaininizin DNS
sağlayıcısında gösterilen CNAME kaydını ekleyin. TLS sertifikası Northflank tarafından
otomatik sağlanır.

## 12) Internal networking

`api` ve `web` aynı Northflank projesindeyse, `web`'in `api`'ye erişimi için public
domain şart değildir — Northflank internal service discovery (`http://api:4000` benzeri
bir iç adres) kullanılabilir. Ancak bu proje mimarisinde frontend build-time'da
`VITE_API_URL`'i tarayıcıdan erişilebilir bir public URL olarak gömdüğü için (SPA,
sunucu tarafı proxy yok), **API'nin de public bir domaine sahip olması gerekir**.
