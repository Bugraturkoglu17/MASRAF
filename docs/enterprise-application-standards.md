# Değişmez Kurumsal Uygulama Standardı

Bu proje basit bir demo, prototip, örnek çalışma veya geçici uygulama değildir.

Uygulama gerçek bir firma tarafından günlük operasyonlarda kullanılacak profesyonel bir kurumsal masraf yönetim sistemidir.

Bu nedenle hiçbir aşamada basit, geçici, sahte veya kırılgan çözümler üretme.

## Zorunlu ilkeler

- Frontend gerçek backend API’ye bağlı çalışmalıdır.
- Backend gerçek Neon PostgreSQL veritabanına bağlı olmalıdır.
- Dosya ve belgeler gerçek Cloudflare R2 private depolama alanına yüklenmelidir.
- Uygulama Northflank üzerinde aktif ve production uyumlu çalışmalıdır.
- Hardcoded veri, sahte sayaç, mock kayıt ve sahte başarılı işlem kullanma.
- Veritabanı bağlantısı yoksa çalışıyor gibi gösterme.
- R2 bağlantısı yoksa dosya yüklenmiş gibi gösterme.
- Sunucu çalışmıyorsa sistemi hazır kabul etme.
- Production ortamında placeholder ekran bırakma.
- Geçici workaround yerine sorunun kök nedenini düzelt.
- İşlem başarısızsa kullanıcıya gerçek hata durumunu göster.
- Test edilmemiş işlemi tamamlandı olarak işaretleme.

## Veri tutarlılığı

- Tüm kayıtlar veritabanından gelmelidir.
- Frontend sayaçları backend verileriyle uyumlu olmalıdır.
- Kullanıcı ve yönetici panelleri aynı ana veri kaynağını kullanmalıdır.
- Masraf durumlarında tek bir authoritative status alanı kullanılmalıdır.
- Transaction gerektiren işlemler transaction içinde yapılmalıdır.
- Onay, ret, iptal, bildirim ve audit kayıtları tutarlı şekilde oluşturulmalıdır.
- Aynı işlem iki kez çalıştırılamamalıdır.
- Çift kayıt ve yarış koşulları engellenmelidir.

## Performans ve veri gecikmesi

- Verilerde gecikme, eski cache veya senkronizasyon problemi görülürse geçici olarak gizleme.
- Sorunun kaynağını araştır:
  - API gecikmesi
  - Veritabanı sorgusu
  - Eksik index
  - Connection pool
  - TanStack Query cache
  - WebSocket veya SSE bağlantısı
  - Bildirim kuyruğu
  - Northflank servis durumu
  - Neon bağlantısı
  - R2 erişimi
- Kök nedeni tespit et ve kalıcı şekilde düzelt.
- Gerekiyorsa retry, timeout, reconnect ve fallback mekanizması ekle.
- Tam sayfa yenilemeyi çözüm olarak kullanma.
- Kullanıcıya eski veri gösterme.
- İşlem tamamlanmadan başarılı mesajı gösterme.

## Sunucu ve bağlantı dayanıklılığı

- Backend health check endpointleri aktif olmalıdır.
- Readiness kontrolü Neon bağlantısını doğrulamalıdır.
- R2 bağlantı durumu izlenebilmelidir.
- Sunucu geçici hata verirse kontrollü retry uygulanmalıdır.
- WebSocket veya SSE bağlantısı koparsa otomatik yeniden bağlanmalıdır.
- Realtime bağlantı kurulamazsa kontrollü query invalidation veya polling fallback kullanılmalıdır.
- Sonsuz retry döngüsü oluşturma.
- Kullanıcıya anlaşılır bağlantı durumu göster.

## Kurumsal güvenlik

- Yetkilendirme yalnızca frontend’de yapılmamalıdır.
- Tüm kritik izinler backend guard ile doğrulanmalıdır.
- Kullanıcı yalnızca kendi kayıtlarını görmelidir.
- Yönetici yalnızca yetkili olduğu organizasyonun kayıtlarını görmelidir.
- ADMIN erişimleri audit log ile kaydedilmelidir.
- Secret değerleri kaynak kodda, frontend’de veya loglarda bulunmamalıdır.
- R2 bucket private olmalıdır.
- Dosyalar signed URL ile açılmalıdır.
- IBAN, telefon ve diğer hassas veriler izinsiz gösterilmemelidir.
- IDOR, çift işlem, yetki aşımı ve organizasyon dışı erişim engellenmelidir.

## Kurumsal kullanıcı deneyimi

- Tasarım mobile-first ve PWA uyumlu olmalıdır.
- Arayüz sade olabilir ancak basit veya amatör görünmemelidir.
- Tüm ekranlar tutarlı tasarım sistemini kullanmalıdır.
- İşlemlerde modal, spinner, skeleton, toast ve hata durumları bulunmalıdır.
- Yeni sekme veya tarayıcı penceresi açılmamalıdır.
- Tam sayfa yenilenmemelidir.
- Kullanıcı işlem sonrası bulunduğu ekranda kalmalıdır.
- Sadece ilgili kayıt, liste ve sayaç güncellenmelidir.
- Boş, yükleniyor, hata ve çevrimdışı durumları profesyonel şekilde tasarlanmalıdır.

## Kod kalitesi

- Geçici, dağınık veya tekrar eden kod yazma.
- Modüler, test edilebilir ve sürdürülebilir yapı kullan.
- TypeScript strict mode korunmalıdır.
- any kullanımından kaçın.
- Backend servis, repository ve guard sorumluluklarını ayır.
- Frontend feature bazlı yapı kullan.
- Merkezi hata, config ve API yönetimi kullan.
- Kritik iş kurallarını component içine dağınık şekilde yazma.
- Teknik kararları dokümante et.

## Test zorunluluğu

Her aşamada en az şu kontrolleri çalıştır:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `docker compose config`

İlgili aşamada ayrıca:

- Integration test
- E2E test
- Yetki testi
- Mobil ekran testi
- Neon bağlantı testi
- R2 bağlantı testi
- Realtime senkronizasyon testi
- Health check testi

çalıştır.

Test sonucu başarısızsa:

- Hatayı gizleme.
- Kök nedeni yaz.
- Düzeltmeyi uygula.
- Testi yeniden çalıştır.
- Testler geçmeden aşamayı tamamlandı olarak işaretleme.

## Sonuç

Bu uygulama gerçek firma kullanımına hazır, güvenli, hızlı, veri tutarlı, mobil uyumlu, kurulabilir PWA ve production ortamında sürdürülebilir olmalıdır.

Her teknik kararda en kolay çözümü değil, uzun vadede güvenli ve profesyonel çözümü tercih et.
