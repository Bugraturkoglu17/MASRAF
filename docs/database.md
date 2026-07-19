# Veritabanı

Kaynak şema: [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

## Tasarım kararları

- **UUID birincil anahtarlar** (`@default(uuid()) @db.Uuid`): dağıtık üretim, tahmin
  edilemezlik, gelecekte birden fazla veritabanı arasında birleştirme kolaylığı.
- **Para alanları**: `Decimal(14, 2)` — floating point (`Float`/`Double`) kullanılmaz;
  yuvarlama hatası muhasebe verisinde kabul edilemez.
- **Soft delete**: Kritik tablolarda (`User`, `Department`, `Expense`,
  `ExpenseCategory`, `Attachment`, `Comment`) `deletedAt DateTime?` alanı vardır. Sorgular
  her zaman `deletedAt: null` filtresiyle yazılır; fiziksel silme yalnızca GDPR/KVKK
  talebi gibi istisnai durumlarda, ayrı bir prosedürle yapılır.
- **createdBy / updatedBy**: Kullanıcıya bağlı FK yerine bilinçli olarak düz `String?
  @db.Uuid` alan olarak tutulur — kullanıcı silinse bile geçmiş kayıtların "kim
  oluşturdu" bilgisi bozulmaz (dangling reference kabul edilebilir, çünkü bu alanlar
  yalnızca gösterim/denetim amaçlıdır, ilişkisel bütünlük gerektirmez).
- **Dosyalar veritabanında tutulmaz**: `Attachment` yalnızca `fileKey`, `mimeType`,
  `sizeBytes`, `sha256` gibi metadata tutar; ikili içerik S3 uyumlu depoda durur (bkz.
  [storage.md](storage.md)).
- **organizationId ile multi-tenant izolasyon**: bkz. [architecture.md](architecture.md).

## Model özeti

| Model | Amaç |
| --- | --- |
| `Organization` | Kiracı (şirket) kök varlığı |
| `Department` | Organizasyon altı departman |
| `User` | Kullanıcı hesabı, argon2 hash'lenmiş şifre |
| `Role` / `Permission` / `RolePermission` / `UserRole` | RBAC |
| `RefreshToken` | Hash'lenmiş refresh token oturumları |
| `ExpenseCategory` | Masraf kategorisi (organizasyon bazlı) |
| `Expense` | Masraf kaydı — durum, tutar, tarihler |
| `ExpenseStatusHistory` | Durum geçiş geçmişi (audit-benzeri, ama iş verisine özel) |
| `Approval` | Onay/ret kararı kaydı |
| `Attachment` | Dosya metadata'sı |
| `Comment` | Masraf üzerine yorum |
| `Notification` | Kullanıcıya özel bildirim |
| `AuditLog` | Sistem geneli denetim kaydı |

## Migration komutları

```bash
pnpm db:generate   # Prisma Client üret (schema değişince gerekir)
pnpm db:migrate    # development: migration dosyası oluştur + uygula
pnpm db:deploy     # production: yalnızca bekleyen migration'ları uygula, dosya oluşturmaz
pnpm db:studio     # Prisma Studio (veri inceleme arayüzü)
```

## Test veritabanı izolasyonu

CI pipeline'ında `masraf_test` adlı ayrı bir veritabanı kullanılır
(`.gitlab-ci.yml` içindeki `DATABASE_URL`). Lokal `pnpm test:e2e` çalıştırmadan önce
`.env` içindeki `DATABASE_URL`'in production veritabanını göstermediğinden emin olun.

## Örnek veri

`apps/api/prisma/seed.ts`, tüm `Permission` kayıtlarını, sistem rollerini (`OWNER`,
`ADMIN`, `MANAGER`, `ACCOUNTANT`, `EMPLOYEE`), bir demo organizasyon ve bir demo
kullanıcı (`owner@demo.local` / `ChangeMe123!`) oluşturur. Yalnızca development/staging
ortamlarında çalıştırılmalıdır.
