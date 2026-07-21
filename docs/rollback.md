# Rollback

## Tetikleyiciler

Readiness/login/rol paneli başarısızlığı, migration hatası, Neon/R2 kritik hata, karışık service-worker sürümü, HIGH+ açık, veri sızıntısı veya kabul edilemez hata oranı deploy'u durdurur.

## Uygulama rollback

1. Trafiği durdur veya bakım modunu aç.
2. Northflank'te API'yi önceki başarılı commit-SHA imajına döndür.
3. `/health/ready` kontrolü ardından web'i eşleşen önceki SHA'ya döndür.
4. Service worker sürümünü doğrula; eski/yeni asset karışımı varsa yeni bir düzeltme build'i yayınla, cache'i uzaktan zorla silme.
5. Smoke ve rol bazlı okuma testlerini yeniden çalıştır.

## Migration

Şema değişiklikleri expand-and-contract olmalıdır. Eski backend'in yeni şemayla çalışmadığı veya veri silen migrationlarda otomatik rollback yoktur; deploy önceden engellenir. Gerekirse yeni restore hedefi oluşturulur ve [disaster-recovery.md](disaster-recovery.md) uygulanır.

Rollback tamamlandıktan sonra olay kaydı, etkilenen süre, sürüm SHA'ları ve doğrulama sonuçları tutulur.
