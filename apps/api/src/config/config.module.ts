import { ConfigModule as NestConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { validateEnv } from './env.validation';

export const ConfigModule = NestConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  load: [configuration],
  validate: validateEnv,
  // Hem "pnpm --filter @masraf/api ..." (cwd=apps/api) hem de monorepo kökünden
  // çalıştırma durumlarını kapsar. Docker/CI'da bu dosyalardan hiçbiri mevcut
  // değildir; platform env değişkenlerini doğrudan process.env üzerinden enjekte
  // eder, bu yüzden eksik dosyalar sessizce yok sayılır.
  envFilePath: ['.env', '../../.env'],
});
