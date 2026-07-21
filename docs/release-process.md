# Release süreci

1. `staging` branch pipeline'ı ve kabul raporu tamamlanır.
2. CHANGELOG güncellenir; açık HIGH+ sorun olmadığı doğrulanır.
3. `main` fast-forward/merge ve korumalı `vX.Y.Z` tag yapılır.
4. İmajlar commit SHA ile üretilir; `latest` deploy referansı olarak kullanılmaz.
5. Backup kanıtı alınır; production migration ve deploy işleri ayrı manuel onayla çalıştırılır.
6. `/api/v1/app/version` ile version/SHA/build tarihi, web tanılama sürümüyle eşleştirilir.
7. Smoke test ve ilk 24 saat izleme başlatılır.

Rollbackte aynı sürüme ait web/API SHA çifti kullanılır. Release tag yalnız tüm kabul kriterleri sağlandığında oluşturulur.
