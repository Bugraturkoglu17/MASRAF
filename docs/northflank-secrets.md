# Northflank Secret Group Yönetimi

> Secret Group, gizli değerleri birden fazla servise güvenli şekilde dağıtır.
> Değerleri kod içine veya bu belgeye yazmayın.

## Secret Group Oluşturma

1. Northflank → Takımınız → Proje → **Secret Groups** → **New Secret Group**
2. Ad: `masraf-api-secrets`
3. Scope: **Project** (yalnızca bu projedeki servislere erişilebilir)

## Eklenecek Secret'lar

Aşağıdaki değerleri tek tek ekleyin. Her birini ayrı bir satır olarak kaydedin.

### Veritabanı (Neon)

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Neon pooler bağlantısı — `?sslmode=require` ile |
| `DIRECT_URL` | Neon doğrudan bağlantısı — yalnızca migration job'ı için |

### Kimlik Doğrulama

| Değişken | Nasıl Üretilir |
|---|---|
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (farklı değer) |
| `COOKIE_SECRET` | `openssl rand -base64 48` (farklı değer) |

### Cloudflare R2

| Değişken | Kaynağı |
|---|---|
| `R2_ACCESS_KEY_ID` | R2 API Token oluşturulduktan sonra |
| `R2_SECRET_ACCESS_KEY` | R2 API Token oluşturulduktan sonra |

## Secret Group'u Servise Bağlama

1. Northflank → Proje → `masraf-api` servisi → **Environment** → **Link Secret Group**
2. `masraf-api-secrets`'i seçin
3. **Sadece api servisine bağlayın**; `masraf-web` servisinin bu secret'lara erişimi olmamalıdır.

## Geri Kalan Non-Secret Değişkenler (api servisi)

Bu değerler hassas değildir; servis environment'ına doğrudan eklenebilir:

```
NODE_ENV=production
API_PORT=4000
WEB_URL=https://app.<domaininiz>
API_URL=https://api.<domaininiz>       # veya Northflank iç ağ kullanılıyorsa yok
CORS_ORIGINS=https://app.<domaininiz>
STORAGE_PROVIDER=s3
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=masraf-attachments
R2_FORCE_PATH_STYLE=false
R2_SIGNED_URL_TTL_SECONDS=900
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
LOG_LEVEL=info
```

## Web Servisi Environment Değişkenleri

`masraf-web` servisi yalnızca build argümanı gerektirir, runtime secret'a ihtiyaç duymaz:

**Build Arguments** (Northflank → Servis → Build → Arguments):
```
VITE_API_URL=/api/v1
```

> `VITE_API_URL` relative olarak ayarlanır. Nginx `/api` isteklerini API servisine proxy eder.
> Bu sayede API'nin public domain'i gerekmez ve secret web servisine geçmez.

## Migration Job'ı için Ayrı Secret

`prisma migrate deploy` çalıştıran Northflank Job'ına şu secret'ları bağlayın:

- `DATABASE_URL` (migration sonuçları için)
- `DIRECT_URL` (DDL komutları için zorunlu)

Bu job `masraf-api-secrets` grubuna bağlanabilir.

## Ortam Yönetimi

Her ortam (staging, production) için **ayrı Secret Group** oluşturun:

- `masraf-api-secrets-staging` → staging projesine bağlı
- `masraf-api-secrets-production` → production projesine bağlı

Aynı secret değerini iki ortamda paylaşmayın.
