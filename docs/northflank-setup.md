# Northflank panel kurulumu

Bu adımlar kullanıcı tarafından panelde uygulanmalıdır; repository hazırlığı servis oluşturulduğu anlamına gelmez.

## Projeler

`masraf-staging` ve `masraf-production` ayrı projeler olmalıdır. GitLab repository bağlantısını yetkili kullanıcı kurar. Production automatic deploy kapalı, staging isteğe bağlı açık tutulur.

## masraf-api

1. Add Service → Deployment → Git repository veya GitLab Registry image.
2. Build context `.`, Dockerfile `apps/api/Dockerfile`, internal port `4000`.
3. Public endpoint kapalı; web ile aynı project/network kullanılır.
4. Secret Group'u bağla; non-secret `NODE_ENV`, `APP_ENVIRONMENT`, `PORT`, `APP_VERSION`, `APP_COMMIT_SHA`, `APP_BUILD_DATE`, `LOG_LEVEL` ekle.
5. Liveness `/health/live`; readiness `/health/ready`; R2 alarmı `/health/storage`.
6. Başlangıç 0.5 vCPU/512 MB, 10 dakika deployment timeout, failure restart.

## masraf-web

1. Build context `.`, Dockerfile `apps/web/Dockerfile`, internal/public port `8080`.
2. Build args: `VITE_API_URL=/api/v1`, `VITE_APP_ENVIRONMENT=production`, `VITE_APP_VERSION=<release>`.
3. Runtime `API_INTERNAL_URL`, Northflank'in masraf-api için panelde gösterdiği gerçek internal HTTP adresidir. Örnek değer kopyalanmaz; panelden alınır.
4. Health `/healthz`; public custom domain ve zorunlu HTTPS açılır.
5. Başlangıç 0.25 vCPU/256 MB.

## Migration job

Production API imajı pnpm CLI içermediği için GitLab `production:migrate` işi önerilir. Bu iş protected `PRODUCTION_DIRECT_URL` ile, backup kanıtından sonra `pnpm db:deploy` çalıştırır. Northflank job kullanılacaksa builder/migration amaçlı ayrı image kullanılmalıdır; API başlangıç komutuna migration eklenmez.

## Deploy ve rollback

API → readiness → web sırası kullanılır. Deploy referansı commit SHA'dır. Northflank Deployments geçmişinde önceki eşleşen API/web SHA çifti kaydedilir. Rollback sonrası health, login ve PWA smoke yeniden çalışır.
