# Proje teslimi

## Bileşenler

- Web: `apps/web`, React/Vite PWA, production Nginx 8080
- API: `apps/api`, NestJS/Prisma, internal 4000
- Veritabanı: Neon PostgreSQL; runtime pooled, migration direct
- Dosya: private Cloudflare R2, signed URL
- Pipeline: `.gitlab-ci.yml`
- Operasyon: `docs/production-*.md`, backup, rollback, monitoring

## Günlük komutlar

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:security
pnpm test:pwa
```

## Sorumluluk devri

Platform sahibi GitLab protected variables/branches, Northflank servis/alarmlar, Neon backup/branch ve R2 bucket/token/CORS ayarlarından sorumludur. Uygulama sahibi migration inceleme, release SHA eşleşmesi, kabul raporu ve smoke sonucunu onaylar. Incident/on-call kişisi rollback ve secret rotation yetkisine sahip olmalıdır.

## Teslim koşulu

Mevcut paket production altyapı hazırlığıdır; canlı deploy veya v1.0.0 etiketi değildir. [known-limitations.md](known-limitations.md) kapatılıp staging kabulü, restore tatbikatı, Docker taraması ve production smoke kanıtı olmadan release onayı verilmez.
