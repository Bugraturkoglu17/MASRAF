# Development Workflow

## Branch ve commit stratejisi

- `main` — her zaman deploy edilebilir durumda.
- Özellik geliştirme için kısa ömürlü feature branch'ler: `feat/<konu>`,
  `fix/<konu>`, `chore/<konu>`.
- Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/)
  formatına yakın tutulur: `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`,
  `ci: ...`.

## Kod kalitesi otomasyonu

- **Husky + lint-staged**: `git commit` öncesi değişen dosyalarda `eslint --fix` ve
  `prettier --write` otomatik çalışır (`.husky/pre-commit`).
- CI pipeline'ı (`.gitlab-ci.yml`) her push'ta `lint` → `typecheck` → `test` → `build`
  sırasını zorunlu kılar; bu aşamalardan biri başarısız olursa merge request
  birleştirilmemelidir.

## Yeni bir modül eklerken

1. `apps/api/src/modules/<isim>/` altında `*.module.ts`, `*.service.ts`,
   `*.controller.ts` üçlüsünü oluşturun.
2. Paylaşılan tipler `packages/shared-types`e, doğrulama şemaları
   `packages/shared-validation`a eklenir — aynı kural hem backend hem frontend
   tarafından kullanılır.
3. Organizasyon kapsamlı veri döndüren her servis metodu `organizationId` parametresi
   almalı ve Prisma sorgusunda kullanmalıdır (bkz. `ExpensesService` örnek).
4. Yetki gerektiren uçlara `@RequirePermissions({ action, resource })` eklenir; yeni bir
   `PermissionResource`/`PermissionAction` gerekiyorsa hem `schema.prisma` hem
   `packages/shared-types/src/enums.ts` güncellenir ve migration oluşturulur.
5. En az bir unit test (`*.spec.ts`) eklenir.

## Yeni bir frontend sayfası eklerken

1. `apps/web/src/pages/` altında bileşeni oluşturun.
2. `apps/web/src/routes/router.tsx` içine route tanımını ekleyin; yetki gerekiyorsa
   `PermissionGate` ile sarmalayın.
3. Sunucu verisi için TanStack Query (`useQuery`/`useMutation`) kullanın,
   `apps/web/src/lib/api-client.ts` üzerinden.
4. Form varsa `react-hook-form` + `packages/shared-validation` içindeki (veya yeni
   eklenen) Zod şeması ile doğrulayın.

## Test felsefesi

- **Unit test**: Servis/guard/pipe gibi saf mantık — dış bağımlılıklar mock'lanır.
- **E2E test** (`apps/api/test/e2e`): Gerçek PostgreSQL/MinIO gerektirir, CI'da ayrı
  `services:` bloğuyla sağlanır.
- **Component test** (`apps/web`): Testing Library ile davranış odaklı, implementasyon
  detayına bağlı olmayan testler.

## Sürüm/dal koruması önerisi

GitLab → Settings → Repository → Protected Branches: `main` için en az bir onay
zorunluluğu ve doğrudan push'un kapatılması önerilir (bu ayar bu oturumda sizin adınıza
uygulanmadı; panel erişimi gerektirir).
