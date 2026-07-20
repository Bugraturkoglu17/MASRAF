# Neon PostgreSQL Kurulumu

> Bu belge Neon panelinde sizin uygulamanız gereken adımları listeler.
> Erişim bilgilerini (host, user, password) bu belgeye yazmayın.

## 1. Proje Oluşturma

1. [console.neon.tech](https://console.neon.tech) → **New Project**
2. Ad: `masraf-yonetim-sistemi`
3. PostgreSQL sürümü: **16** (uyum için)
4. Bölge: Uygulamanızın deploy edileceği bölgeye yakın seçin (ör. `eu-west-2`)

## 2. Veritabanı Oluşturma

Neon varsayılan olarak `neondb` adında bir veritabanı oluşturur. İsterseniz yeniden adlandırın:

- Neon Panel → **Databases** → **New Database** → ad: `masraf`

## 3. Bağlantı Adreslerini Alma

Neon'da iki farklı bağlantı uç noktası vardır:

### DATABASE_URL — Pooler Bağlantısı (Runtime)

- Neon Panel → **Dashboard** → **Connection Details**
- **Connection string** kutusunda açılır menüden: **Pooled connection** seçin
- Bağlantı modu: **Transaction** (varsayılan ve önerilen)
- Bu adresi `DATABASE_URL` olarak kullanın

```
postgresql://user:password@ep-xxx.pooler.us-east-2.aws.neon.tech/masraf?sslmode=require
```

Pooler (PgBouncer, transaction mode), eş zamanlı bağlantı sayısını sınırlandırır ve
Serverless / kısa ömürlü işlemler için uygundur. Prisma bu bağlantıyı query çalıştırmak için kullanır.

### DIRECT_URL — Doğrudan Bağlantı (Prisma Migration)

- Aynı **Connection Details** sayfasında: **Direct connection** seçin
- Bu adresi `DIRECT_URL` olarak kullanın

```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/masraf?sslmode=require
```

`prisma migrate deploy` ve `prisma generate`, `SET TRANSACTION` gibi DDL komutları kullanır.
PgBouncer transaction mode bu komutlarla uyumsuzdur; bu yüzden doğrudan bağlantı gereklidir.

## 4. DATABASE_URL ve DIRECT_URL Ayrımı

| Değişken | Kullanım | Bağlantı Türü |
|---|---|---|
| `DATABASE_URL` | Uygulama runtime (Prisma Client) | Pooler — PgBouncer transaction mode |
| `DIRECT_URL` | `prisma migrate` / `prisma generate` | Doğrudan — pooler yok |

Her iki değişken de `sslmode=require` içermelidir. Neon bağlantılarında SSL zorunludur.

## 5. Prisma Şema Yapılandırması

`apps/api/prisma/schema.prisma` içinde her iki değişken kullanılır:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 6. Migration Çalıştırma

**İlk kurulum:**
```bash
pnpm --filter @masraf/api db:deploy
```

**Geliştirme sırasında yeni migration:**
```bash
pnpm --filter @masraf/api db:migrate
```

## 7. Branching (Opsiyonel)

Neon'un branching özelliği ile staging ve production için ayrı veritabanı branch'leri oluşturabilirsiniz:

- Neon Panel → **Branches** → **New Branch**
- `main` branch: production
- `staging` branch: staging ortamı

Her branch'in kendi bağlantı adresleri (DATABASE_URL, DIRECT_URL) ayrı ayrı alınır.

## 8. Güvenlik Notları

- Neon bağlantı bilgilerini kod içine yazmayın, `.env.example`'da placeholder kullanın.
- Production ortamında Neon IP izin listesi konfigürasyonu yapın (Neon Panel → **Settings** → **IP Allow**).
- `DIRECT_URL`'yi yalnızca migration job'ına erişilebilir yapın; uygulama servisi yalnızca `DATABASE_URL` kullanmalıdır.
