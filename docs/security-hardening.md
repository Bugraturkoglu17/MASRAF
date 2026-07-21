# Production güvenlik sertleştirmesi

- Access token yalnız bellekte ve Authorization header'da; URL/localStorage kullanılmaz.
- Refresh cookie HttpOnly, Secure production, SameSite=Strict, dar `/api/v1/auth` path ve sınırlı ömürlüdür.
- Refresh token SHA-256 hash ile saklanır, her kullanımda döndürülür; tekrar kullanım tüm refresh oturumlarını iptal eder.
- JWT her istekte aktif kullanıcı/rol/izin durumunu DB'den doğrular.
- CORS allowlist; refresh/logout Origin doğrulaması; API 1 MB body limiti; login/refresh rate limit.
- CSP, HSTS, nosniff, frame-ancestors, referrer ve permissions policy Nginx/API'de uygulanır.
- Swagger production'da kapalıdır; stack trace istemciye verilmez.
- Dosyalar private R2'de, tahmin edilemez organization-scoped key ve kısa signed URL ile erişilir.
- Loglarda auth/cookie/password/token/IBAN/telefon/signed URL alanları redakte edilir.

## Secret rotation

Yeni secret platformda eklenir, servis kontrollü yeniden başlatılır, health/smoke çalıştırılır ve eski secret sağlayıcıda iptal edilir. JWT refresh secret değişimi tüm kullanıcı oturumlarını düşürür; access secret değişimi mevcut access tokenları anında geçersiz kılar. Database/R2 rotation iki anahtarın kısa örtüşme penceresiyle yapılır. Olay kaydına secret değeri değil kimlik, zaman ve sorumlu yazılır.
