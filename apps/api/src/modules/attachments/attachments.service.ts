import { Injectable } from '@nestjs/common';

import { ForbiddenAppException, NotFoundAppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async uploadForExpense(
    organizationId: string,
    userId: string,
    expenseId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
    });
    if (!expense) {
      throw new NotFoundAppException('Masraf');
    }
    if (expense.userId !== userId) {
      throw new ForbiddenAppException('Yalnızca kendi masrafınıza dosya ekleyebilirsiniz.');
    }

    const stored = await this.storageService.storeAttachment(
      organizationId,
      file.originalname,
      file.mimetype,
      file.buffer,
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        organizationId,
        expenseId,
        fileKey: stored.fileKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        uploadedById: userId,
      },
    });

    await this.auditLogs.record({
      organizationId,
      actorId: userId,
      action: 'UPLOAD',
      resource: 'ATTACHMENT',
      resourceId: attachment.id,
    });

    return attachment;
  }

  async getSignedUrl(attachmentId: string, organizationId: string, userId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId, deletedAt: null },
      include: { expense: { select: { userId: true } } },
    });
    if (!attachment) {
      throw new NotFoundAppException('Dosya');
    }
    if (attachment.expense && attachment.expense.userId !== userId) {
      throw new ForbiddenAppException('Bu dosyaya erişim yetkiniz yok.');
    }
    const url = await this.storageService.getSignedDownloadUrl(attachment.fileKey);
    return { url };
  }
}
