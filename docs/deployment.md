# Deployment

Bu belge platform bağımsız genel deployment kurallarını açıklar. Northflank'e özel,
panelde uygulanacak adım adım talimatlar için [northflank-setup.md](northflank-setup.md).

## Genel ilke: platformdan bağımsızlık

`apps/api/Dockerfile` ve `apps/web/Dockerfile`, herhangi bir container platformunda
(Northflank, Railway, Render, DigitalOcean App Platform, Hetzner + Docker Compose, ham
bir VPS) aynı şekilde çalışacak şekilde yazılmıştır. Platform'a özgü hiçbir kod
(`process.env.NORTHFLANK_*` gibi) API veya web kodunda **kullanılmaz**. Tek platforma
özgü değişken CORS/URL ayarlarıdır ve bunlar zaten `.env` üzerinden dışarıdan
enjekte edilir.

## Domain ve HTTPS kararı

İki seçenek değerlendirildi:

1. `app.domain.com` (frontend) + `api.domain.com` (backend) — **seçilen yaklaşım**
2. `domain.com` (frontend) + `domain.com/api` (backend, ters proxy ile birleştirilmiş)

**Karar: Seçenek 1 (ayrı alt domain'ler).** Gerekçe:

- Northflank (ve benzeri PaaS'lar) her servise kendi genel domain'ini otomatik
  atar; alt domain yaklaşımı ek bir reverse-proxy/path-rewrite katmanı gerektirmez.
- CORS yapılandırması netleşir (`CORS_ORIGINS=https://app.domain.com`).
- API ve web bağımsız ölçeklenebilir/deploy edilebilir; path-based birleştirme bunu
  zorlaştırır.
- Cookie tabanlı refresh token için `SameSite=Strict` yeterli kalır (alt domain'ler her
  ikisi de aynı üst domain altında olduğu sürece; farklı üst domain kullanılacaksa
  `SameSite=None; Secure` gerekecektir — bu proje kapsamında aynı üst domain
  varsayılmıştır).

HTTPS tüm ortamlarda zorunludur; Northflank ve benzeri platformlar otomatik TLS
sağlar. Kendi VPS'inizde çalıştırıyorsanız `infrastructure/nginx` önüne
Caddy/Traefik/Let's Encrypt eklemeniz gerekir (bu repo kapsamında hazır değildir).

## Migration stratejisi

Migration'lar **uygulama container'ı başlarken otomatik çalıştırılmaz** — bu, birden
fazla replika ayağa kalkarken migration'ın birden fazla kez veya yarış durumunda
çalışmasını önler. Bunun yerine:

1. Yeni sürüm deploy edilmeden **önce**, tek seferlik bir job/adım olarak
   `pnpm --filter @masraf/api db:deploy` çalıştırılır (Northflank'te "Job" kaynağı,
   GitLab CI'da ayrı bir manuel stage, veya VPS'te SSH ile tek komut).
2. Migration başarılı olduktan sonra API servisinin yeni image'ı deploy edilir.
3. Geri alma (rollback) gerekiyorsa önce eski image'a dönülür, migration geri alma
   yalnızca gerçekten geriye dönük uyumsuzluk varsa ayrı bir "down" migration ile
   yapılır (Prisma otomatik down migration üretmez; kritik migration'lar için elle
   yazılmalıdır).

## Ortamlar

| Ortam | Amaç | Veritabanı |
| --- | --- | --- |
| Development | Lokal geliştirme | Docker Compose PostgreSQL |
| Test | CI pipeline | Ayrı `masraf_test` veritabanı, her çalıştırmada temiz |
| Staging | Northflank'te ayrı proje, yayın öncesi doğrulama | Ayrı PostgreSQL addon |
| Production | Canlı kullanıcılar | Ayrı PostgreSQL addon, günlük yedekleme önerilir |

## GitLab CI/CD Variables (gerekli)

Aşağıdaki değişkenler GitLab'da **Settings → CI/CD → Variables** altında, "Protected"
ve mümkünse "Masked" olarak eklenmelidir (pipeline'ın `container` stage'i için):

| Değişken | Açıklama |
| --- | --- |
| `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` | GitLab otomatik sağlar (Container Registry kullanılıyorsa genelde ek ayar gerekmez) |

Northflank'in doğrudan GitLab'dan build alması tercih edilirse `container:*` job'ları
devre dışı bırakılabilir — bkz. [northflank-setup.md](northflank-setup.md#build-kaynağı-seçimi).

## Rollback

Container tabanlı platformlarda (Northflank dahil) rollback, önceki başarılı image
tag'ine (`:<önceki-commit-sha>`) geri dönmekten ibarettir; veri tabanı migration'ı geri
almayı gerektirmiyorsa ek işlem yoktur. Northflank panelinde "Deployments" geçmişinden
tek tıkla önceki sürüme dönülebilir (bkz. northflank-setup.md).
