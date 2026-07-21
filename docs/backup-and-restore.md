# Yedekleme ve geri yükleme

## Politika

| Veri | Sıklık | Saklama | Hedef |
| --- | --- | --- | --- |
| Neon point-in-time/branch | günlük | sağlayıcı planına göre en az 7 gün | Neon, erişim kontrollü |
| Mantıksal PostgreSQL yedeği | haftalık | 8 hafta | şifreli ayrı backup bucket |
| Deploy/migration öncesi snapshot | her release | 30 gün | Neon branch/restore point |
| R2 object inventory + DB metadata | günlük | 30 gün | şifreli ayrı backup bucket |
| Migration geçmişi | her release | süresiz | Git + release artifact |

Yedekler repository'ye veya uygulama container diskine yazılmaz. Backup kimliği, SHA-256, tarih, kaynak sürüm, şifreleme anahtarı kimliği ve sorumlu kişi operasyon kaydına yazılır; secret yazılmaz.

## PostgreSQL mantıksal yedek

Migration öncesi kontrollü runner'da:

```bash
pg_dump --format=custom --no-owner --no-acl "$PRODUCTION_DIRECT_URL" --file=masraf.dump
sha256sum masraf.dump > masraf.dump.sha256
```

Dosya istemci tarafında KMS/age/GPG ile şifrelenip ayrı backup bucket'a yüklenir; yerel açık kopya güvenli biçimde kaldırılır. Komut geçmişine URL yazmamak için değişken masked/protected CI variable olmalıdır.

## Test geri yükleme

1. Production olmayan yeni Neon test branch/DB oluştur.
2. Şifreli yedeği izole runner'a indir ve hash doğrula.
3. `pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_TEST_DIRECT_URL" masraf.dump` çalıştır.
4. `DATABASE_URL` ve `DIRECT_URL` yalnız restore test hedefini gösterecek şekilde `prisma migrate status` çalıştır.
5. Kullanıcı, masraf, attachment metadata, audit ve migration tablolarının sayımını kaynak manifestle karşılaştır.
6. Test R2 prefix/bucket ile örnek dosya erişimini doğrula.
7. API health, login ve örnek taslak akışını çalıştır.
8. Sonucu tarih/süre/RPO/RTO ile kaydet; test veritabanını kontrollü kaldır.

Production veritabanı üzerine restore testi kesinlikle yapılmaz.
