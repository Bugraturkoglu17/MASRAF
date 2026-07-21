# Production kontrol listesi

## Engelleyici kapılar

- [ ] BLOCKER/CRITICAL/HIGH açık sorun yok
- [ ] Staging USER/MANAGER/ADMIN kabul testi geçti
- [ ] Raporlama ve dışa aktarma kabul testi geçti
- [ ] `pnpm install --frozen-lockfile`, lint, typecheck, test ve build geçti
- [ ] Dependency/secret/container taramaları geçti
- [ ] Her iki Docker imajı non-root çalıştı ve health check geçti
- [ ] Neon pooled/direct bağlantıları SSL ile doğrulandı
- [ ] R2 private bucket, CORS, TTL ve dosya testleri geçti
- [ ] Geri yükleme tatbikatı production dışı hedefte geçti
- [ ] Önceki imaj SHA'ları ve migration listesi kaydedildi
- [ ] Production backup kanıtı kaydedildi

## Konfigürasyon

- [ ] `NODE_ENV=production`, `APP_ENVIRONMENT=production`
- [ ] `APP_VERSION`, `APP_COMMIT_SHA`, `APP_BUILD_DATE`
- [ ] Yalnız HTTPS `WEB_URL`, `API_URL`, `CORS_ORIGINS`
- [ ] Birbirinden farklı JWT access/refresh ve cookie secret
- [ ] Swagger kapalı
- [ ] `VITE_API_URL=/api/v1`; frontend build içinde secret yok
- [ ] Northflank Secret Group yalnız production servislerine bağlı
- [ ] `API_INTERNAL_URL` gerçek internal API hostname'i

## Son kontrol

- [ ] `/health/live`, `/health/ready`, `/health/storage`, `/api/v1/app/version`
- [ ] CSP, HSTS, nosniff, frame, referrer ve permissions başlıkları
- [ ] Manifest/service worker/update/offline
- [ ] Production logunda token, cookie, signed URL, IBAN veya stack trace yok
- [ ] Smoke test ve rollback sorumlusu belli
