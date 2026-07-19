import { ConfigModule as NestConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { validateEnv } from './env.validation';

export const ConfigModule = NestConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  load: [configuration],
  validate: validateEnv,
  envFilePath: ['.env'],
});
