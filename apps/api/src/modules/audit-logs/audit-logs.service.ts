import type { PaginationQuery } from '@masraf/shared-types';
import { Injectable } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';

import { buildPaginatedResult, toPrismaSkipTake } from '../../common/utils/pagination.util';
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

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

/**
 * İş olaylarını (kullanıcı/rol/masraf/dosya değişiklikleri) kalıcı olarak
 * kaydeder. Teknik loglardan (nestjs-pino) ayrı tutulur; asla şifre, token
 * veya dosya ikili içeriği tutmaz.
 */
@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditLogInput, client: AuditClient = this.prisma): Promise<void> {
    await client.auditLog.create({
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
  }

  async listForOrganization(organizationId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { organizationId };
    const [logs, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const actorIds = [...new Set(logs.flatMap((log) => (log.actorId ? [log.actorId] : [])))];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds }, organizationId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    const items = logs.map((log) => ({
      ...log,
      actor: log.actorId ? (actorsById.get(log.actorId) ?? null) : null,
    }));
    return buildPaginatedResult(items, totalItems, query);
  }
}
