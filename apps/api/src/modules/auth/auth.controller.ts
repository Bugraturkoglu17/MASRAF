import { loginSchema } from '@masraf/shared-validation';
import {
  Body,
  Controller,
  ForbiddenException,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AppConfig } from '../../config/configuration';

import { AuthService } from './auth.service';

const REFRESH_COOKIE_NAME = 'masraf_refresh_token';

/**
 * Karar: access token yalnızca JSON gövdesinde döner ve frontend'de yalnızca
 * bellekte (React state) tutulur, localStorage'a yazılmaz — XSS ile çalınma
 * riskini azaltır. Refresh token httpOnly + Secure + SameSite=Strict cookie
 * olarak taşınır; JavaScript'ten okunamaz, bu da onu XSS'e karşı korur.
 * Detay: docs/security.md.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const tokens = await this.authService.login(body.email, body.password, ip);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    this.assertTrustedOrigin(req);
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token bulunamadı.');
    }
    const tokens = await this.authService.refresh(refreshToken, ip);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    return { success: true };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const app = this.configService.get<AppConfig>('app')!;
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: app.env === 'production',
      sameSite: 'strict',
      ...(app.cookieDomain ? { domain: app.cookieDomain } : {}),
      path: '/api/v1/auth',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  private assertTrustedOrigin(req: Request): void {
    const origin = req.header('origin');
    if (!origin) return;
    const app = this.configService.get<AppConfig>('app')!;
    if (!app.corsOrigins.includes(origin)) {
      throw new ForbiddenException('İstek kaynağına izin verilmiyor.');
    }
  }
}
