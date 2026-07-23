# Changelog

## [Unreleased]

### feat: fatura yönetimi, fotoğraf düzenleyici ve taslak aksiyonları (2026-07-23)

**Fatura Yönetimi**
- `AttachmentUploader` bileşeni yeniden yazıldı: fatura alanı taslak kaydedilmeden önce de görünür
- İki ayrı buton: "Fotoğraf Çek" (kamera) ve "Fotoğraf Yükle" (galeri/PDF)
- Yüklenen her fatura için görüntüleme (lightbox), değiştirme ve silme aksiyonları (`AttachmentCard`)
- Masraf düzenleme ekranında (`?edit=`) fatura alanı artık görünür (`!editId` koşulu kaldırıldı)

**Fotoğraf Düzenleyici** (`ImageEditor`)
- Canvas tabanlı düzenleyici: sürükle-kaydır (Pointer Events), yakınlaştır (slider), döndür (90°), yeniden seç
- Çıktı: 1080×1080 px JPEG @ 0.92 kalite
- Taslak kaydedilmeden önce seçilen fotoğraflar düzenlenebilir (pending file queue + `PendingFileCard`)

**Taslak Aksiyonları**
- `ConfirmDialog` paylaşılan UI bileşenine çıkarıldı (`components/ui/ConfirmDialog.tsx`)
- Taslak silme işlemi `window.confirm` yerine özel onay modalı kullanıyor
- `UserDashboard` (Ana Sayfa) Taslaklar sekmesine "Onaya gönder", "Düzenle", "Sil" butonları eklendi

**Backend**
- Fatura silme işleminde depolama (MinIO/R2) hatası artık fatal değil; DB kaydı her zaman temizleniyor, hata log'a uyarı olarak düşüyor

---

### fix: local draft recovery loop and neon stage-14 prep (2026-07-21)

- `apps/web/src/pages/user/CreateExpensePage.tsx` icinde local draft autosave kosulu guclendirildi; bos icerikte taslak yeniden olusmasi engellendi.
- Taslak silme aksiyonunda `reset()` cagrisi eklendi; form state temizligi ve tekrar acilista recovery sheet dongusu duzeltildi.
- Recovery sheet sadece gercek icerigi olan taslaklarda acilacak sekilde filtrelendi.
- `apps/api/prisma/schema.prisma` dosyasinda Stage-14 alanlari icin `expenseCode` ve `AttachmentStatus/status` modeli guncellendi.
- Prisma driver adapter denemesi icin `apps/api/src/database/prisma.service.ts` ve API bagimliliklari (`@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`) eklendi.
- Neon ortami icin migration/dogrulama yardimci scriptleri eklendi: `apps/api/apply-stage14-migration.js`, `apps/api/verify-stage14-migration.js`, `apps/api/check-expenses.js`, `apps/api/check-attachments-cols.js`, `scripts/check-expenses.js`, `test-neon-conn.js`, `grant.sql`.

## [da0e541] feat: ASAMA 13 - redesign mobile expense home, approvals and manager history cards

### Kullanıcı masraf girişi, mobil onaylar ve yönetici kartları (2026-07-21)

- USER alt navigasyonu Ana Sayfa, Masraflarım, merkez hızlı ekleme, Onaylar ve Ayarlar olarak yenilendi.
- Merkez `+` menüsüne yalnızca çoklu Galeri, arka Kamera ve Manuel masraf girişleri eklendi; QR/Mesafe seçenekleri kaldırıldı.
- Seçilen belge önizlemesi, merkezi upload limitleri, gerçek R2 upload progress, silme ve aynı dosyayı yeniden deneme tamamlandı.
- Bekleyen/Onaylanan/Reddedilen kullanıcı sekmeleri, profesyonel boş ekranlar ve mobil fiş/kupon masraf kartları eklendi.
- Yönetici kartlarına gönderen ad-soyad/e-posta, tutar, kategori, tarih, vade ve karar aksiyonları eklendi.
- Onay/red/iptal işlemleri aynı route üzerinde modal, optimistik kart kaldırma, sayaç yenileme ve toast ile tamamlandı.
- Telefon ve IBAN liste cevaplarından kaldırıldı; yalnızca yetkili detay isteğinde döndürülüyor.
- ADMIN `Menü` düğmesinin yanlışlıkla profile yönlendirmesi giderildi ve gerçek yönetim menüsü eklendi.
- İndigo/mor kurumsal görsel dil, güvenli alanlar, 44 px dokunma hedefleri ve azaltılmış hareket tercihini destekleyen animasyonlar eklendi.
- AŞAMA 13 doğrulama raporu `docs/stage-13-verification.md` dosyasına eklendi.

### Production güvenliği ve kabul hazırlığı (2026-07-21)

- Production env doğrulaması HTTPS/SSL, ayrı secret, R2, release ve CORS kurallarıyla sertleştirildi.
- Access token URL query desteği kaldırıldı; SSE Authorization header kullanan fetch stream'e geçirildi.
- Kullanıcı masraf detayı IDOR açığı, eşzamanlı çift karar yarışı ve son aktif ADMIN koruması düzeltildi.
- Refresh-token tekrar kullanım tespiti, anlık rol/aktiflik doğrulaması ve oturum iptali eklendi.
- Production Swagger kapatıldı; body limiti, CSP/HSTS ve log redaksiyonu genişletildi.
- R2 health readiness'ten ayrıldı; `/health/storage`, app version/config ve bakım modu eklendi.
- Node 22 LTS/Nginx sabit imajları, read-only compose ve internal API proxy tamamlandı.
- GitLab pipeline güvenlik taramaları, kontrollü migration/deploy kapıları ve smoke test eklendi.
- Bildirim placeholder'ı gerçek API bağlı bildirim merkezine dönüştürüldü.
- Production, backup/restore, disaster recovery, rollback, monitoring ve kullanıcı teslim belgeleri eklendi.

Nihai durum ve açık engeller: `docs/acceptance-test-results.md`.

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
