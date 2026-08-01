import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

import { NotificationsService, type PushSubscriptionDto } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForUser(user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.markRead(id, user.id);
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.service.markAllRead(user.id);
    return { success: true };
  }

  /** VAPID public key — tarayıcı push aboneliği için gerekli */
  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.service.getVapidPublicKey() };
  }

  /** Push aboneliğini kaydet */
  @Post('push-subscriptions')
  async subscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscriptionDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    await this.service.savePushSubscription(user.id, {
      ...dto,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });
    return { success: true };
  }

  /** Push aboneliğini sil */
  @Delete('push-subscriptions')
  async unsubscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { endpoint: string },
  ) {
    await this.service.deletePushSubscription(body.endpoint, user.id);
    return { success: true };
  }
}
