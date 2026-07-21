# Neon production

- Production, staging ve test için ayrı project/branch ve ayrı roller kullanın.
- `DATABASE_URL` runtime pooled connection; `DIRECT_URL` migration/backup direct connection olmalıdır.
- Her iki URL `sslmode=require` içermelidir. Production rolü schema owner olmamalı; migration rolü ayrı tutulmalıdır.
- Northflank API Secret Group'a `DATABASE_URL`; yalnız korumalı migration job'a `DIRECT_URL` verin.
- Connection limitini API replica sayısı ve Neon planına göre belirleyin; Prisma Client uygulamada singleton'dır.
- Slow query ve connection alarmını açın. Migration öncesi restore point/branch oluşturun.

Panel doğrulaması: connection details'dan pooled/direct ayrımını kontrol et, staging ile production endpointlerinin farklı olduğunu kanıtla, read-only sayım ve `/health/ready` çalıştır. Bu adımlar hesap erişimi gerektirir ve repository içinde yapılmış sayılmaz.
