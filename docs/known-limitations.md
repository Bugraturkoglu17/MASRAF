# Bilinen sınırlamalar

## Canlıya alma engelleri

- Raporlama/Excel/PDF modülleri ve rol bazlı rapor ekranları repository'de yok.
- Admin kullanıcı oluşturma/düzenleme, kategori, sistem ayarı ve kullanıcı bazlı ALLOW/DENY arayüz/API kapsamı tamamlanmamış. Audit log API ve sayfalı admin ekranı mevcuttur.
- Manager iptal arayüzü yok; backend iptal kontratı eklenmiş olsa da uçtan uca kabul edilmedi.
- Bildirim kayıtları masraf numarası/işlem türü gibi yapılandırılmış alanları taşımıyor; bazı olaylar için üretim eksik.
- Realtime altyapısı process içi Subject kullanıyor; birden fazla API replica arasında event dağıtımı yok ve USER paneli SSE kullanmıyor. Manager SSE beş sınırlı reconnect denemesinden sonra 30 saniyelik polling fallback'e geçer.
- Persistent hesap kilidi/şifre sıfırlama ve yaygın şifre listesi henüz yok; yalnız rate limit ve Argon2 var.
- Signed R2 URL, üretildikten sonra TTL boyunca URL'yi bilen kişiyle paylaşılabilir; çok hassas belgeler için backend streaming/download proxy değerlendirilmelidir.

## Doğrulama sınırlamaları

- GitLab, Northflank, Neon production ve Cloudflare hesap erişimi sağlanmadı; staging/production deploy, gerçek backup/restore ve bağlantı doğrulaması yapılmadı.
- Docker CLI mevcut fakat Docker engine çalışmıyor; image build/runtime/non-root testi bu makinede tamamlanamadı.
- Gerçek Android/iOS kurulum, kamera, klavye ve standalone testi fiziksel cihaz gerektirir.
- Local R2 adapter hazır değilse `/health/storage` başarısızdır; bu sahte başarı olarak raporlanmaz.

Bu maddeler giderilene kadar sürüm `NOT_READY_FOR_PRODUCTION` durumundadır.
