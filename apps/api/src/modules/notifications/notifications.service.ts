import { Injectable } from '@nestjs/common';
import type { NotificationChannel, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

type NotificationClient = Pick<Prisma.TransactionClient, 'notification'>;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    metadata?: { expenseId?: string; eventKey?: string },
  ) {
    const data = { organizationId, userId, title, body, channel, ...metadata };
    if (!metadata?.eventKey) return client.notification.create({ data });

    return client.notification.upsert({
      where: { userId_eventKey: { userId, eventKey: metadata.eventKey } },
      create: data,
      update: {},
    });
  }
}
