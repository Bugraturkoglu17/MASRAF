# Güvenlik

## Kimlik doğrulama

Şifreler Argon2 ile hashlenir. Access token kısa ömürlüdür, yalnız kullanıcı/organizasyon kimliği taşır ve frontend belleğinde tutulur. Rol, izin, aktiflik ve profil durumu her API isteğinde veritabanından doğrulanır. Refresh token HttpOnly/Secure/SameSite=Strict cookie'dedir; hashlenmiş saklanır, döndürülür ve tekrar kullanımı tüm refresh oturumlarını iptal eder.

Login ve refresh rate-limitlidir. Refresh/logout isteğinde tarayıcı Origin allowlist kontrolü yapılır. Production'da CORS wildcard, HTTP origin ve placeholder secret env doğrulamasından geçmez.

## Yetkilendirme ve tenant izolasyonu

JWT global, rol/izin korumaları endpoint bazında çalışır. Bütün sorgular `organizationId` ile scope edilir. USER masraf detayında ayrıca owner kontrolünden geçer; manager/admin yalnız kendi organizasyonunu görür. Son aktif ADMIN ve adminin kendi rolü backend'de korunur; rol/pasiflik değişimi refresh oturumlarını iptal eder.

## Dosya ve PWA

R2 private olmalıdır. Upload/download backend yetkilendirmesi sonrası kısa signed URL üretir. Tür/boyut/sayı ve organization-scoped key kontrol edilir; binary PostgreSQL'e yazılmaz. Service worker bütün `/api/` isteklerinde NetworkOnly kullanır ve hassas yanıtları cache etmez.

## Tarayıcı/API

Nginx CSP, HSTS, nosniff, frame, referrer ve permissions başlıklarını uygular. API Helmet kullanır, 1 MB JSON limiti uygular, production Swagger'ı kapatır ve stack trace döndürmez. Yapılandırılmış loglar auth/cookie/password/token/IBAN/telefon/signed URL alanlarını redakte eder.

Ayrıntılı operasyon ve rotation kontrolü: [security-hardening.md](security-hardening.md).
