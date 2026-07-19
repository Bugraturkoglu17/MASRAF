import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordAuditLogInput {
  organizationId?: string | null;
  actorId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * İş olaylarını (kullanıcı/rol/masraf/dosya değişiklikleri) kalıcı olarak
 * kaydeder. Teknik loglardan (nestjs-pino) ayrı tutulur; asla şifre, token
 * veya dosya ikili içeriği tutmaz.
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: input.organizationId ?? null,
          actorId: input.actorId ?? null,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId ?? null,
          metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (error) {
      // Audit kaydı asıl iş akışını bloklamamalı; hata teknik loga düşer.
      this.logger.error('Audit log kaydı oluşturulamadı', error as Error);
    }
  }
}
