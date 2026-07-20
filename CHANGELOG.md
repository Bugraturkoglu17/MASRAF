# Changelog

## [Unreleased]

### fix: vite dev sunucusu CJS workspace paketi çözüm hatası (2026-07-20)

**Sorun:** Web uygulaması tamamen boş sayfa gösteriyordu. React DOM hiç render etmiyordu.

**Kök neden:** `packages/shared-validation` ve `packages/shared-types` TypeScript ile CommonJS (`"module": "CommonJS"`) formatında derleniyor. Vite dev sunucusu bu workspace paketlerini ESM native modül olarak yüklemeye çalıştığında tarayıcı `SyntaxError: The requested module does not provide an export named 'loginSchema'` hatası veriyordu ve uygulama hiç başlamıyordu (hata konsola yansımadan sessizce başarısız oluyordu).

**Çözüm:** `apps/web/vite.config.ts` dosyasına `optimizeDeps.include` eklendi. Bu sayede Vite'ın esbuild ön-derleme adımı bu paketleri CJS → ESM'e çevirdi:

```ts
optimizeDeps: {
  include: ['@masraf/shared-validation', '@masraf/shared-types'],
},
```

Not: `build.commonjsOptions.include` zaten vardı ama bu yalnızca production Rollup build'ini etkiler, dev sunucusunu etkilemez.

**Değişen dosya:** `apps/web/vite.config.ts`

---

## [150455a] feat: add mobile expense drafts uploads and submission flow (2026-07-20)

### Eklenen

**Backend (apps/api)**
- `ExpenseCounter` modeli ile yarış koşulsuz 8 haneli sıralı masraf numarası üretimi (`10000000`'dan başlar)
- `ExpenseCategory.requiresDueDate` alanı — vade tarihi zorunluluğunu kategori bazında kontrol eder
- `GET /attachments/:id/download-url` — R2 presigned download URL endpoint'i
- `DELETE /attachments/:id` — ek dosya silme endpoint'i
- `POST /expenses/:id/submit` — taslak masrafı PENDING'e gönderir, 8 haneli numara atar
- `POST /expenses/:id/cancel` — kullanıcı kendi taslağını veya beklemedeki masrafını iptal edebilir
- `GET /events/manager` SSE endpoint'i — manager paneline gerçek zamanlı bildirim (RxJS Subject)
- JWT stratejisine `?token=` query parametre desteği (SSE EventSource header gönderemez)
- `RealtimeModule` / `RealtimeService` / `RealtimeController`

**Frontend (apps/web)**
- `CreateExpensePage` — mobil öncelikli masraf oluşturma formu, iki adımlı akış (taslak kaydet → dosya yükle)
- `AttachmentUploader` — 3 yükleme modu: kamera, galeri, PDF/Excel; ilerleme çubuğu; yeniden deneme
- `ExpenseDetailSheet` — alt tabaka olarak açılan masraf detay ekranı (bottom sheet pattern)
- `ExpenseSubmitDialog` — masrafı onaya gönderme onay diyaloğu
- `DueDateBadge` — vade tarihine göre renk kodlu rozet (vadesi geçmiş/bugün/yakın/normal)
- `StatusBadge` — CANCELLED durumu eklendi
- `UserExpensesPage` — 4 sekme (Taslak/Bekleyen/Onaylanan/Reddedilen), FAB butonu, bottom sheet entegrasyonu
- `useManagerSse` hook — ManagerLayout içinde SSE bağlantısını yönetir, ilgili TanStack Query sorgularını geçersiz kılar
- `lib/date-utils.ts` — `calcDaysRemaining` fonksiyonu ayrı dosyaya taşındı (react-refresh ESLint kuralı)

**Düzeltilen ESLint hataları**
- `react-hooks/refs` — ref array erişimi yerine `triggerUpload(kind)` fonksiyon pattern'i kullanıldı
- `react-refresh/only-export-components` — bileşen olmayan export'lar TSX dosyasından çıkarıldı
- `react-hooks/incompatible-library` — `watch()` yerine `useWatch({ control, name })` kullanıldı
- `import/order` — alfabetik sıralama düzeltildi

---

## [7f04888] feat: add auth onboarding and role based panel skeleton (önceki)

- JWT erişim token (15 dk) + HttpOnly refresh cookie (30 gün) auth akışı
- Profil tamamlama zorunluluğu (`ProfileGuard`)
- USER / MANAGER / ADMIN rol bazlı rota koruması (`RoleRoute`)
- Kullanıcı, Yönetici, Admin panel iskelet layout'ları
- TanStack Query + axios `api-client` kurulumu

---

## [df3d243] chore: prepare neon r2 and northflank infrastructure (önceki)

- Neon serverless PostgreSQL bağlantısı
- Cloudflare R2 presigned URL yükleme akışı (dev'de MinIO placeholder)
- Northflank Secret Groups yapılandırması
- Prisma schema başlangıç migration'ı

---

## [b1ed6e3] / [bbf0cfd] fix: production runtime bug fixes (önceki)

- NestJS DI import sırası düzeltmesi
- Neon canlı ortam test sonrası bulunan runtime hataları giderildi
