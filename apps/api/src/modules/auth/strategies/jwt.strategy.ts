import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import type { AppConfig } from '../../../config/configuration';
import { PrismaService } from '../../../database/prisma.service';
import type { AccessTokenPayload } from '../token.types';

/**
 * Access token yalnızca kullanıcı ve organizasyon kimliklerini taşır. Rol,
 * izin, profil ve aktiflik her istekte veritabanından okunur; böylece pasife
 * alma ve kritik yetki değişiklikleri açık oturuma anında yansır.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const app = configService.get<AppConfig>('app')!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: app.jwt.accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.organizationId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Oturum artık geçerli değil.');

    const roles = user.userRoles.map((item) => item.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map(
            (rolePermission) =>
              `${rolePermission.permission.action}:${rolePermission.permission.resource}`,
          ),
        ),
      ),
    ];

    return {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      roles,
      permissions,
      profileCompleted: user.profileCompleted,
    };
  }
}
