# Northflank Secret Group

Staging ve production için farklı Secret Group oluşturun; web servisine hiçbir backend secret bağlamayın.

## API secretları

- `DATABASE_URL` — Neon pooled runtime URL
- `DIRECT_URL` — API servisine değil, yalnız migration/backup job'a
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — en az 32 karakter ve birbirinden farklı
- `R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `SMTP_PASSWORD` ve gerekiyorsa `SENTRY_DSN`

Non-secret API değerleri: `WEB_URL`, `API_URL`, `CORS_ORIGINS`, `R2_REGION=auto`, `R2_SIGNED_URL_TTL_SECONDS`, `LOG_LEVEL`, `APP_*`, `MAINTENANCE_*`, `ENABLE_SWAGGER=false`.

GitLab deploy tokenı ve Northflank webhookları yalnız GitLab protected/masked variables içinde tutulur. Rotation sırasında yeni credential eklenir, health/smoke doğrulanır, sonra eski credential iptal edilir. Secret değerleri ekran görüntüsü, log, ticket veya repository'ye kopyalanmaz.
