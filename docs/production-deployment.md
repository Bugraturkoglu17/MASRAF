# Production deployment

## Hedef topoloji

`Kullanıcı → masraf-web (HTTPS) → /api/v1 → masraf-api → Neon / Cloudflare R2`

Tek public origin kullanılır. Web servisi public 8080 portundan yayınlanır; API yalnızca Northflank iç ağında 4000 portunda tutulur. `VITE_API_URL=/api/v1`, web servisinde `API_INTERNAL_URL=http://<northflank-api-internal-host>:4000` olmalıdır.

## Ön koşullar

- GitLab `main`, `staging` ve `v*` tag koruması etkin.
- Pipeline lint, typecheck, test, audit, secret scan, image build ve Trivy adımlarından geçmiş.
- Neon production branch/DB ve pooled/direct URL ayrılmış.
- R2 production bucket private; bucket-scoped token ve yalnızca web origin CORS tanımlı.
- Northflank `masraf-production` Secret Group eksiksiz.
- Geri dönüş noktası ve önceki çalışan web/API imaj SHA'ları kaydedilmiş.

## Kontrollü sıra

1. Staging pipeline ve kabul raporunu onayla.
2. `vX.Y.Z` tag oluştur; container imajlarını değişmez commit SHA ile üret.
3. Neon geri dönüş noktası/branch oluştur ve R2 inventory al.
4. GitLab `production:migrate` işini manuel çalıştır. `PRODUCTION_BACKUP_VERIFIED=true` yalnızca kanıt kaydedildikten sonra ayarlanır.
5. Northflank API servisini ilgili SHA imajına geçir.
6. `/health/live` ve `/health/ready` 200 olana kadar bekle; `/health/storage` ayrıca 200 olmalı.
7. Web servisini aynı SHA sürümüne geçir.
8. `pnpm test:smoke` komutunu production URL ile çalıştır.
9. Login, rol panelleri, manifest ve service worker için yıkıcı olmayan kontrol yap.
10. İlk 24 saat izleme planını başlat.

Migration uygulama container başlangıcında çalışmaz. Yalnızca GitLab'ın manuel migration işi `DIRECT_URL` ile `prisma migrate deploy` çalıştırır. Veri silen/değiştiren migration için expand-and-contract ve ikinci manuel onay gerekir.

## Northflank servisleri

| Ayar | masraf-web | masraf-api |
| --- | --- | --- |
| Build context | repository kökü | repository kökü |
| Dockerfile | `apps/web/Dockerfile` | `apps/api/Dockerfile` |
| Port | 8080 public | 4000 internal |
| Health | `/healthz` | `/health/ready` |
| Başlangıç kaynak | 0.25 vCPU / 256 MB | 0.5 vCPU / 512 MB |
| Restart | failure, en çok 3 hızlı tekrar | failure, en çok 3 hızlı tekrar |
| Timeout | 10 dakika | 10 dakika |

İlk ölçümlerden sonra CPU/bellek güncellenir. API readiness yalnızca veritabanını kontrol eder; R2 kesintisi `/health/storage` alarmı üretir fakat restart döngüsü başlatmaz.

## HTTPS ve domain

`app.example.com` Northflank web endpointine bağlanır. Platform TLS sertifikası aktif olmadan DNS trafiği açılmaz. HTTP→HTTPS yönlendirmesi platformda zorunlu tutulur. API ayrı public domain olarak yayınlanmaz.

## Deploy yapılmadı

Bu repository hazırlığı Northflank/GitLab/Neon/R2 hesabına erişim sağlamaz. Panelde servis, secret, backup, migration veya production deploy oluşturulduğu anlamına gelmez.
