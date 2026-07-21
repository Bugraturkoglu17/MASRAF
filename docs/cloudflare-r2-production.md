# Cloudflare R2 production

1. Production için ayrı private bucket oluştur; public development URL ve custom public domain açma.
2. Yalnız bu bucket'ta Object Read/Write yetkili API token oluştur; hesap-geneli token kullanma.
3. CORS originini yalnız production web HTTPS adresi yap; `GET, PUT, HEAD`, gerekli content-type header ve kısa max-age tanımla.
4. Lifecycle: geçici rapor prefix'i için kısa süre; silinmiş/orphan attachment için karantina ve kontrollü temizlik politikası belirle.
5. `R2_ACCOUNT_ID`, endpoint, bucket ve credentials değerlerini Northflank Secret Group'a gir; frontend'e koyma.
6. `/health/storage`, signed upload/download, boyut/tür, yanlış organizasyon key'i ve süresi dolan URL testlerini staging'de çalıştır.

Uygulama object key'leri `attachments/<organizationId>/<date>/<random>` biçiminde üretir; PostgreSQL yalnız metadata tutar. Signed URL sahibi URL'yi TTL süresince paylaşabilir; bu nedenle TTL kısa tutulmalı, URL loglanmamalı ve hassas belgeler için ek indirme proxy'si değerlendirilmelidir.
