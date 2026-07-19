# API

- Base path: `/api/v1` (health check uçları hariç — bkz. aşağıda)
- Swagger/OpenAPI: `/api/docs`

## Kimlik doğrulama

| Uç | Açıklama | Public |
| --- | --- | --- |
| `POST /api/v1/auth/login` | E-posta/şifre ile giriş; access token döner, refresh cookie set eder | ✅ (rate limited: 5/dk) |
| `POST /api/v1/auth/refresh` | Refresh cookie ile yeni access token alır | ✅ |
| `POST /api/v1/auth/logout` | Refresh token'ı iptal eder, cookie'yi temizler | ✅ |

Diğer tüm uçlar `Authorization: Bearer <accessToken>` başlığı gerektirir.

## Health

| Uç | Açıklama |
| --- | --- |
| `GET /health` | Genel health check (DB + storage) |
| `GET /health/live` | Süreç ayakta mı (bağımlılık kontrolü yok) |
| `GET /health/ready` | Trafiğe hazır mı (DB + storage erişilebilir) |

## İş uçları (özet)

| Uç | İzin |
| --- | --- |
| `GET /api/v1/users/me` | (herhangi bir doğrulanmış kullanıcı) |
| `GET /api/v1/users` | `READ:USER` |
| `GET /api/v1/organizations/me` | (herhangi bir doğrulanmış kullanıcı) |
| `GET /api/v1/departments` | (herhangi bir doğrulanmış kullanıcı) |
| `GET /api/v1/expense-categories` | (herhangi bir doğrulanmış kullanıcı) |
| `POST /api/v1/expenses` | `CREATE:EXPENSE` |
| `GET /api/v1/expenses` | `READ:EXPENSE` (yalnızca kendi kayıtları) |
| `GET /api/v1/expenses/pending` | `APPROVE:EXPENSE` (organizasyon geneli) |
| `POST /api/v1/expenses/:id/approve` | `APPROVE:EXPENSE` |
| `POST /api/v1/expenses/:id/reject` | `REJECT:EXPENSE` |
| `POST /api/v1/expenses/:expenseId/attachments` | `CREATE:ATTACHMENT` |
| `GET /api/v1/attachments/:id/signed-url` | `READ:ATTACHMENT` |
| `POST /api/v1/expenses/:expenseId/comments` | (masraf sahibi) |
| `GET /api/v1/notifications` | (herhangi bir doğrulanmış kullanıcı) |

Tam parametre/response şemaları için Swagger UI kullanın (kod, `@nestjs/swagger`
dekoratörleriyle otomatik dokümante edilir).

## Standart hata formatı

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Gönderilen bilgiler geçersiz.",
  "details": [{ "path": "email", "message": "Geçerli bir e-posta adresi giriniz." }],
  "requestId": "3f1d7e2a-...",
  "timestamp": "2026-07-19T12:00:00.000Z"
}
```

`requestId`, `X-Request-Id` yanıt başlığıyla da döner; destek taleplerinde loglarla
eşleştirmek için kullanılır.

## Pagination / sorting / filtering sözleşmesi

Liste uçları ortak query parametrelerini kabul eder (bkz.
`packages/shared-validation/src/pagination.schema.ts`):

| Parametre | Varsayılan | Açıklama |
| --- | --- | --- |
| `page` | `1` | 1 tabanlı sayfa numarası |
| `pageSize` | `20` (maks. `100`) | Sayfa boyutu |
| `sortBy` | - | Sıralama alanı (uca özel) |
| `sortOrder` | `desc` | `asc` \| `desc` |

Yanıt zarfı:

```json
{
  "items": [],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 1 }
}
```

## Versiyonlama

URL tabanlı versiyonlama kullanılır (`/api/v1`). Kırıcı değişiklikler `/api/v2` altında
yayınlanır; eski sürüm bir geçiş süresi boyunca paralel çalıştırılır.

## Rate limiting

Global: 100 istek/dakika/IP (`RATE_LIMIT_MAX`, `RATE_LIMIT_TTL_MS`). Login uç noktası
ayrıca 5 istek/dakika ile sınırlıdır (`AUTH_RATE_LIMIT_MAX`).

## Body ve dosya limitleri

- JSON gövde: Express varsayılanı (üretimde ihtiyaç halinde `main.ts` üzerinden
  daraltılabilir).
- Dosya yükleme: `multipart/form-data`, tekil dosya, maksimum 15 MB
  (`MAX_ATTACHMENT_SIZE_BYTES`, bkz. [storage.md](storage.md)).
