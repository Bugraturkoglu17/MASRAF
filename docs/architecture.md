# Mimari

## Genel Bakış

Sistem, ilk sürümde bilinçli olarak **modüler monolith** olarak tasarlanmıştır: tek bir
NestJS API süreci, modüller arası net sınırlarla (her modül kendi controller/service/DTO
katmanına sahiptir) ama tek bir dağıtım birimi olarak çalışır. Mikroservis mimarisi bu
aşamada gereksiz operasyonel karmaşıklık getireceği için tercih edilmemiştir; modüller
ileride ayrı servislere bölünebilecek şekilde (Prisma erişimi yalnızca kendi servisleri
üzerinden, cross-module doğrudan repository erişimi yok) sınırlandırılmıştır.

```mermaid
flowchart LR
    U[Kullanıcı] --> W[PWA Frontend<br/>React + Vite]
    W -->|REST /api/v1, JSON| A[NestJS API]
    A --> D[(PostgreSQL<br/>Prisma)]
    A --> S[(S3 uyumlu depolama<br/>Attachments)]
    A -.audit/log.-> D
```

## Katmanlar

| Katman | Sorumluluk |
| --- | --- |
| `apps/web` | Kullanıcı arayüzü, PWA kabuğu, kimlik doğrulama akışı (UI) |
| `apps/api` | İş kuralları, RBAC, veri erişimi, dosya depolama koordinasyonu |
| `packages/shared-types` | Frontend/backend arasında paylaşılan TS tipleri |
| `packages/shared-validation` | Zod şemaları — hem backend (ZodValidationPipe) hem frontend (react-hook-form resolver) aynı kuralı kullanır |
| PostgreSQL | Kalıcı ilişkisel veri |
| S3 uyumlu depolama | Fiş/fatura dosyaları (yalnızca metadata veritabanında) |

## Multi-tenant yaklaşımı

Her iş verisi (`User`, `Department`, `Expense`, `Attachment`, ...) `organizationId` alanı
taşır. Yetkilendirme katmanında:

1. `JwtStrategy` erişim jetonundaki `organizationId`'yi `request.user`'a yazar.
2. Servis katmanı her sorguyu `organizationId` ile filtreler (bkz. `UsersService`,
   `ExpensesService`).
3. `OrganizationScopeGuard`, URL'de `:organizationId` parametresi taşıyan uçlarda
   kullanıcının kendi organizasyonu dışına çıkmasını engeller.

Bu yaklaşım, ileride tam bağımsız şema/veritabanı izolasyonuna (schema-per-tenant)
geçişe de temel oluşturur; bugünkü satır bazlı izolasyon, düşük operasyonel maliyetle
başlamak için tercih edilmiştir.

## Kimlik doğrulama akışı

```mermaid
sequenceDiagram
    participant B as Tarayıcı (PWA)
    participant A as NestJS API
    participant D as PostgreSQL

    B->>A: POST /auth/login {email, password}
    A->>D: Kullanıcı + rol + izinleri getir
    A->>A: argon2.verify(password)
    A->>D: RefreshToken kaydı oluştur (hash)
    A-->>B: 200 {accessToken} + Set-Cookie (httpOnly refresh)
    Note over B: accessToken yalnızca bellekte tutulur

    B->>A: GET /users/me (Authorization: Bearer accessToken)
    A-->>B: 200 kullanıcı bilgisi

    Note over B,A: accessToken süresi dolunca
    B->>A: POST /auth/refresh (cookie otomatik gönderilir)
    A->>D: RefreshToken doğrula, rotasyon uygula
    A-->>B: 200 {yeni accessToken} + Set-Cookie (yeni refresh)
```

## Masraf oluşturma ve onay akışı

```mermaid
sequenceDiagram
    participant E as Çalışan
    participant A as NestJS API
    participant D as PostgreSQL
    participant M as Yönetici

    E->>A: POST /expenses {kategori, tutar, tarih, ...}
    A->>D: Expense(PENDING) + ExpenseStatusHistory oluştur
    A-->>E: 201 Expense

    M->>A: GET /expenses/pending
    A->>D: organizationId + status=PENDING sorgusu
    A-->>M: Bekleyen masraf listesi

    M->>A: POST /expenses/:id/approve
    A->>D: Expense.status=APPROVED, Approval + StatusHistory kaydı
    A->>D: Notification(userId=E) oluştur
    A-->>M: 200 güncellenmiş Expense
```

## Neden bu kararlar?

- **REST, GraphQL değil**: Ekip aşinalığı, Swagger ile otomatik dokümantasyon, basit
  CRUD ağırlıklı bir domain için yeterli.
- **Prisma**: Tip güvenli sorgular, migration sistemi, PostgreSQL'e özgü tiplerle
  (`Decimal`, `Uuid`) iyi entegrasyon.
- **Zod tek doğrulama kaynağı**: `packages/shared-validation`, hem backend hem frontend
  tarafından import edilir; iş kuralı iki yerde ayrı ayrı yazılmaz.
- **Access token bellekte, refresh token httpOnly cookie**: bkz.
  [security.md](security.md).
