# İzleme ve ilk 24 saat

## Sinyaller ve başlangıç eşikleri

| Sinyal | Uyarı | Kritik |
| --- | --- | --- |
| API 5xx oranı (5 dk) | > %1 | > %5 veya 5 dk sürmesi |
| p95 cevap süresi | > 750 ms | > 2 sn |
| Login hata oranı | tabanın 3 katı | brute-force veya genel başarısızlık |
| Container restart | 1/saat | 3/15 dk |
| CPU | > %75 / 15 dk | > %90 / 10 dk |
| Bellek | > %80 | > %90 |
| Neon bağlantı hatası | 1 | süreklilik/ready 503 |
| R2 hata oranı | > %1 | upload/download genel arıza |

Northflank log/metric alarmı on-call kişiye gider. `/health/live` restart, `/health/ready` trafik, `/health/storage` harici bağımlılık alarmı içindir. Frontend JS ve service-worker güncelleme hataları PII/token filtreli Sentry benzeri bir sisteme gönderilebilir.

İlk 2 saat 15 dakikada bir; sonraki 6 saat saatte bir; kalan sürede 4 saatte bir health, hata oranı, login, R2, Neon, approval ve restart kontrolü yapılır. Kritik eşikte [rollback.md](rollback.md) uygulanır.
