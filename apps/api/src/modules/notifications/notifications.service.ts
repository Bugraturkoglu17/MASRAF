import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NotificationChannel, Prisma } from '@prisma/client';
import * as webpush from 'web-push';

import { PrismaService } from '../../database/prisma.service';

type NotificationClient = Pick<Prisma.TransactionClient, 'notification'>;

export interface PushSubscriptionDto {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly pushEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@masraf.app';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.pushEnabled = true;
    } else {
      this.logger.warn('VAPID anahtarları bulunamadı — web push devre dışı.');
      this.pushEnabled = false;
    }
  }

  getVapidPublicKey(): string | null {
    return this.pushEnabled ? (this.config.get<string>('VAPID_PUBLIC_KEY') ?? null) : null;
  }

  async savePushSubscription(userId: string, dto: PushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
      },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  async deletePushSubscription(endpoint: string, userId: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  }

  private async sendWebPush(
    userId: string,
    title: string,
    body: string,
    url?: string,
  ): Promise<void> {
    if (!this.pushEnabled) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url: url ?? '/', timestamp: Date.now() });
    const staleEndpoints: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          } else {
            this.logger.warn(`Push gönderilemedi (${sub.endpoint}): ${String(err)}`);
          }
        }
      }),
    );

    if (staleEndpoints.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: staleEndpoints } },
      });
    }
  }
  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    title: string,
    body: string,
    channel: NotificationChannel = 'IN_APP',
    client: NotificationClient = this.prisma,
    metadata?: { expenseId?: string; eventKey?: string; url?: string },
  ) {
    const data = { organizationId, userId, title, body, channel, ...metadata };
    let result;
    if (!metadata?.eventKey) {
      result = await client.notification.create({ data });
    } else {
      result = await client.notification.upsert({
        where: { userId_eventKey: { userId, eventKey: metadata.eventKey } },
        create: data,
        update: {},
      });
    }
    // Arka planda web push gönder (uygulama kapalıyken çalışır)
    void this.sendWebPush(userId, title, body, metadata?.url);
    return result;
  }
}
