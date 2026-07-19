import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import type { AppConfig } from '../../../config/configuration';
import type { AccessTokenPayload } from '../token.types';

/**
 * Karar: erişim jetonu kullanıcının rol/izin listesini içerir (stateless).
 * Bu, her istekte veritabanına gitmeden yetkilendirme yapılmasını sağlar;
 * bedeli, yetki değişikliklerinin en geç mevcut access token süresi (varsayılan
 * 15 dk) kadar gecikmesidir. Kritik yetki değişikliklerinde kullanıcının
 * oturumu kapatılıp yeniden giriş yapması önerilir.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const app = configService.get<AppConfig>('app')!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: app.jwt.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
