# Veritabanı yedekleme özeti

Neon'un point-in-time restore/branch yeteneği birinci geri dönüş katmanıdır; haftalık şifreli `pg_dump` bağımsız ikinci katmandır. Runtime `DATABASE_URL` pooled, migration/backup `DIRECT_URL` direct ve `sslmode=require` olmalıdır.

Uygulanacak takvim, doğrulama ve restore tatbikatı için [backup-and-restore.md](backup-and-restore.md); olay prosedürü için [disaster-recovery.md](disaster-recovery.md) kullanılır.
