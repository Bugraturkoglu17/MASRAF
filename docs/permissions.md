# Roller ve izinler

| Rol | Kapsam |
| --- | --- |
| USER | Kendi profili, masrafları, ekleri ve bildirimleri |
| MANAGER | Kendi organizasyonundaki bekleyen/karar verilmiş masraflar ve yetkili dosyalar |
| ADMIN | Kendi organizasyonunda kullanıcı/rol/durum yönetimi ve rol görünümü |

Backend global JWT koruması kullanır; yönetici uçları `RolesGuard`, ayrıntılı kaynak yetkileri `PermissionsGuard`, servis sorguları `organizationId` ve owner filtreleriyle korunur. URL'deki kimliğe güvenilmez.

Kritik kurallar:

- USER başka kullanıcının masrafını/dosyasını okuyamaz.
- MANAGER/ADMIN başka organizasyona erişemez.
- Son aktif ADMIN pasif veya USER/MANAGER yapılamaz; ADMIN kendi rolünü kaldıramaz.
- Rol değişikliği system role eşleşmesini günceller ve refresh oturumlarını iptal eder.
- Mevcut şemada kullanıcı bazlı ALLOW/DENY override modeli bulunmamaktadır; bu nihai kabul engelidir.
