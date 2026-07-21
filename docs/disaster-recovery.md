# Felaket kurtarma

Hedefler başlangıç için **RPO 24 saat**, **RTO 4 saat**tir. Gerçek restore tatbikatı sonrası sıkılaştırılır.

## Aktivasyon

Veri kaybı, yanlış migration, Neon/R2 bölgesel kesinti, credential sızıntısı veya doğrulanmış bütünlük sorunu olay kaydı açar. Olay lideri değişiklikleri dondurur, bakım modunu etkinleştirir ve zaman çizelgesi tutar.

## Prosedür

1. Etkilenen servisleri salt-okunur/bakım moduna al; health uçlarını açık bırak.
2. Secret sızıntısı varsa tokenları iptal et ve rotation planını uygula.
3. Son sağlam uygulama SHA'sı, migration ve backup manifestini seç.
4. Yeni izole Neon hedefi oluştur; yedeği bu hedefe geri yükle.
5. Migration durumu ve tablo sayımlarını doğrula.
6. R2 inventory ile attachment metadata ilişkilerini karşılaştır; örnek signed URL erişimini test et.
7. İzole API'yi geri yüklenen DB ve test R2 prefix ile başlat; health, login ve taslak akışı çalıştır.
8. Onay sonrası bağlantıyı kontrollü değiştir; API→web sırasıyla deploy et.
9. Smoke test, log ve audit kontrolünden sonra bakım modunu kapat.
10. Olay sonrası kök neden, gerçek RPO/RTO ve önleyici aksiyonları kaydet.

Kanıt olmadan production hedefine doğrudan restore yapılmaz.
