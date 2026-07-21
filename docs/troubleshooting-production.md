# Production sorun giderme

| Belirti | Kontrol | Güvenli işlem |
| --- | --- | --- |
| API restart döngüsü | `/health/live`, env doğrulama logu | Eksik variable adını düzelt; değeri loglama |
| Ready 503 | Neon bağlantı/SSL/limit | Pooled URL ve Neon durumunu kontrol et |
| Storage 503 | R2 endpoint/token/bucket | Bucket-scoped token ve R2 durumunu kontrol et |
| Web 502 | `API_INTERNAL_URL`, API health | Northflank internal hostname/portu düzelt |
| Login cookie yok | HTTPS, proxy trust, SameSite/domain | Tek-origin ve forwarded proto ayarını kontrol et |
| PWA eski sürüm | web/API SHA, `sw.js` cache header | Eşleşen web deploy; kullanıcı güncelleme bildirimi |
| Migration başarısız | job logu, direct URL | Deploy'u durdur; backup/rollback prosedürü |

Stack trace, token, cookie, connection URL veya signed URL ticket'a kopyalanmaz.
