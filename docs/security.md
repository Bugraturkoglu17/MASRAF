# Güvenlik

## Kimlik doğrulama

- Şifreler **argon2id** (`argon2` paketi, varsayılan güvenli parametreler) ile
  hash'lenir. bcrypt yerine argon2 tercih edilmiştir çünkü OWASP güncel önerisi ve
  bellek-zor (memory-hard) yapısı GPU tabanlı saldırılara karşı daha dayanıklıdır.
- **Access token**: JWT, 15 dakika (varsayılan, `.env` ile ayarlanabilir), rol/izin
  listesini içerir (stateless yetkilendirme).
- **Refresh token**: JWT, 30 gün, veritabanında **hash'lenmiş** (`sha256`) olarak
  saklanır; her kullanımda rotasyona uğrar (eski token `revokedAt` ile iptal edilir,
  yenisi verilir). Çalınmış bir refresh token tekrar kullanılmaya çalışılırsa (rotasyon
  sonrası eski hash artık geçersiz olduğundan) istek reddedilir.
- **Token/şifre saklama (frontend)**: Access token yalnızca React state'inde (bellekte)
  tutulur, `localStorage`/`sessionStorage` kullanılmaz. Refresh token, backend
  tarafından `httpOnly; Secure (production); SameSite=Strict` cookie olarak set edilir
  — JavaScript'ten okunamaz, bu da XSS ile çalınmasını engeller. Bellekteki access
  token teorik olarak bir XSS ile okunabilir, ancak sayfa yenilenince kaybolur ve kalıcı
  değildir; bu, güvenlik ile kullanılabilirlik arasında endüstri standardı bir
  dengedir.
- **Çıkış yapma**: `/auth/logout`, ilgili refresh token'ı veritabanında iptal eder ve
  cookie'yi temizler.
- **Şifre sıfırlama**: Bu sürümde uçtan uca uygulanmamıştır; `SMTP_*` ortam değişkenleri
  ve `AuditLogsService` altyapısı buna hazırdır (bkz. README Gelecek Geliştirmeler).

## Yetkilendirme

- **RBAC**: `Role` → `RolePermission` → `Permission` (`ACTION:RESOURCE` ikilisi, ör.
  `APPROVE:EXPENSE`). `PermissionsGuard`, route üzerindeki `@RequirePermissions(...)`
  dekoratörünü kullanıcının izin listesiyle karşılaştırır.
- **Organizasyon kapsamı**: Her servis sorgusu `organizationId` ile filtrelenir;
  `OrganizationScopeGuard` URL parametresi ile token'daki organizasyonun eşleştiğini
  doğrular.
- **Kullanıcı durumu**: `UserStatus` (`ACTIVE`/`INACTIVE`/`SUSPENDED`) login ve refresh
  sırasında kontrol edilir; aktif olmayan kullanıcı oturum açamaz/yenileyemez.

## Brute-force koruması

`@nestjs/throttler` global olarak 100 istek/dakika sınırı uygular;
`POST /auth/login` uç noktası `@Throttle` ile 5 istek/dakikaya indirilmiştir
(`AUTH_RATE_LIMIT_MAX` ile ayarlanabilir).

## Taşıma güvenliği ve HTTP başlıkları

- **Helmet**: Güvenlik başlıkları (`X-Content-Type-Options`, `X-Frame-Options`, vb.)
- **CORS allowlist**: `CORS_ORIGINS` ortam değişkeninden okunur, `*` kullanılmaz.
- **HTTPS**: Production'da zorunludur (Northflank/CDN katmanında sonlandırılır); refresh
  cookie'de `Secure` bayrağı yalnızca `NODE_ENV=production` iken aktiftir.
- **CSRF değerlendirmesi**: Refresh cookie `SameSite=Strict` olduğundan çapraz site
  formları cookie'yi otomatik gönderemez; ayrıca durum değiştiren tüm uçlar
  `Authorization: Bearer` başlığı gerektirir (cookie tek başına yeterli değildir). Bu
  kombinasyon klasik CSRF token ihtiyacını ortadan kaldırır.

## Girdi doğrulama ve enjeksiyon koruması

- Tüm istek gövdeleri `packages/shared-validation` içindeki Zod şemalarıyla
  (`ZodValidationPipe`) doğrulanır; bilinmeyen/eksik alanlar reddedilir.
- **SQL injection**: Prisma parametreli sorgular üretir; ham SQL yalnızca health check
  gibi sabit, parametresiz sorgularda kullanılır.
- **XSS**: React varsayılan olarak çıktı kaçışlar; `dangerouslySetInnerHTML`
  kullanılmaz.

## Dosya güvenliği

Bkz. [storage.md](storage.md) — dosya türü/boyut doğrulaması, rastgele dosya adı,
private bucket, signed URL.

## Hata mesajları

`GlobalExceptionFilter`, production'da (`NODE_ENV=production`) beklenmeyen hataların
stack trace'ini ve iç mesajını istemciye göndermez; yalnızca sunucu logunda tutulur.
İstemciye her zaman `requestId` döner ki destek talebinde ilgili log kaydı bulunabilsin.

## Secret yönetimi

- `.env` dosyası Git'e gönderilmez (`.gitignore`).
- CI'da secret'lar GitLab CI/CD Variables (masked + protected) üzerinden sağlanır.
- Northflank'te Secret Groups kullanılır (bkz.
  [northflank-setup.md](northflank-setup.md)).
- Loglarda şifre, token, cookie, kredi kartı bilgisi asla yazılmaz —
  `apps/api/src/logger/logger.module.ts` içindeki `redact` listesi bu alanları
  otomatik olarak `[REDACTED]` ile değiştirir.

## Bağımlılık güvenliği

`pnpm audit` düzenli olarak (ör. CI'da ayrı bir zamanlanmış job olarak) çalıştırılması
önerilir. Bu sürümde otomatik bir Dependabot/Renovate entegrasyonu kurulmamıştır —
gelecek geliştirme önerisi olarak not edilmiştir.

## Production'da varsayılan şifre kullanımı

`prisma/seed.ts` yalnızca development/staging için tasarlanmıştır ve sabit bir demo
şifresi (`ChangeMe123!`) içerir. **Production ortamında bu seed script'i
çalıştırılmamalı**; ilk yönetici kullanıcısı ayrı, tek seferlik bir prosedürle
(elle SQL veya ayrı bir "bootstrap admin" script'i) güçlü, rastgele bir şifreyle
oluşturulmalıdır.
