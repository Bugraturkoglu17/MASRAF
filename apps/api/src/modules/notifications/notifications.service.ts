import { Injectable } from '@nestjs/common';
import type { NotificationChannel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

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

  async create(
    organizationId: string,
    userId: string,
    title: string,
    body: string,
    channel: NotificationChannel = 'IN_APP',
  ) {
    return this.prisma.notification.create({
      data: { organizationId, userId, title, body, channel },
    });
  }
}
