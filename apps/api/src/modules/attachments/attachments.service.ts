import { extname } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ConflictAppException,
  ExternalServiceAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { assertValidAttachment } from '../../storage/file-validation';
import { StorageService } from '../../storage/storage.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditLogs: AuditLogsService,
    private readonly configService: ConfigService,
  ) {}

  private get uploadLimits() {
    const storage = this.configService.get<AppConfig['storage']>('app.storage')!;
    return {
      maxFiles: storage.maxAttachmentsPerExpense,
      maxSizeBytes: storage.maxAttachmentSizeBytes,
    };
  }

  async requestUploadUrl(
    organizationId: string,
    userId: string,
    expenseId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.userId !== userId)
      throw new ForbiddenAppException('Yalnızca kendi masrafınıza dosya ekleyebilirsiniz.');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflara dosya eklenebilir.');

    const currentCount = await this.prisma.attachment.count({
      where: { expenseId, deletedAt: null },
    });
    if (currentCount >= this.uploadLimits.maxFiles)
      throw new ConflictAppException(`En fazla ${this.uploadLimits.maxFiles} dosya eklenebilir.`);

    const normalizedMimeType = assertValidAttachment(
      fileName,
      mimeType,
      fileSize,
      this.uploadLimits.maxSizeBytes,
    );

    const { fileKey, uploadUrl, expiresIn } = await this.storageService.getSignedUploadUrl(
      organizationId,
      fileName,
      normalizedMimeType,
    );

    return { fileKey, uploadUrl, expiresIn };
  }

  async completeUpload(
    organizationId: string,
    userId: string,
    expenseId: string,
    fileKey: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    fileHash?: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.userId !== userId)
      throw new ForbiddenAppException('Yalnızca kendi masrafınıza dosya ekleyebilirsiniz.');
    if (expense.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflara dosya eklenebilir.');

    const normalizedMimeType = assertValidAttachment(
      fileName,
      mimeType,
      fileSize,
      this.uploadLimits.maxSizeBytes,
    );
    if (!fileKey.startsWith(`attachments/${organizationId}/`)) {
      throw new ForbiddenAppException('Dosya anahtarı organizasyon kapsamı dışında.');
    }
    let uploadedFileExists = false;
    try {
      uploadedFileExists = await this.storageService.fileExists(fileKey);
    } catch (error) {
      this.logger.error(
        `Yüklenen R2 objesi doğrulanamadı. expenseId=${expenseId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ExternalServiceAppException(
        'Yüklenen dosya depolama servisinde doğrulanamadı. Lütfen tekrar deneyin.',
        'STORAGE_VERIFY_FAILED',
      );
    }
    if (!uploadedFileExists) {
      throw new NotFoundAppException('Yüklenen dosya');
    }

    const existingCount = await this.prisma.attachment.count({
      where: { expenseId, deletedAt: null },
    });
    const ext = extname(fileName).toLowerCase();
    const displayFileName =
      existingCount === 0
        ? `${expense.expenseCode}${ext}`
        : `${expense.expenseCode}-${existingCount + 1}${ext}`;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            organizationId,
            expenseId,
            fileKey,
            fileName: displayFileName,
            mimeType: normalizedMimeType,
            sizeBytes: fileSize,
            sha256: fileHash ?? '',
            uploadedById: userId,
          },
        });
        await this.auditLogs.record(
          {
            organizationId,
            actorId: userId,
            action: 'UPLOAD',
            resource: 'ATTACHMENT',
            resourceId: attachment.id,
          },
          tx,
        );
        return attachment;
      });
    } catch (error) {
      // R2 yüklemesi tamamlandıktan sonra metadata/audit transaction'ı başarısızsa
      // sahipsiz private obje bırakmamak için telafi silmesi uygulanır.
      try {
        await this.storageService.deleteFile(fileKey);
      } catch (cleanupError) {
        this.logger.error('Başarısız upload metadata işlemi sonrası R2 telafi silmesi başarısız.', {
          fileKey,
          error: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
        });
      }
      this.logger.error(
        `Attachment metadata kaydı başarısız. expenseId=${expenseId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ExternalServiceAppException(
        'Dosya aktarıldı ancak kaydı tamamlanamadı. Lütfen yeniden deneyin.',
        'ATTACHMENT_METADATA_FAILED',
      );
    }
  }

  async getDownloadUrl(attachmentId: string, organizationId: string, userId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId, deletedAt: null },
      include: { expense: { select: { userId: true, organizationId: true } } },
    });
    if (!attachment) throw new NotFoundAppException('Dosya');
    if (attachment.expense && attachment.expense.userId !== userId) {
      const me = await this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { role: true },
      });
      if (!me || (me.role !== 'MANAGER' && me.role !== 'ADMIN'))
        throw new ForbiddenAppException('Bu dosyaya erişim yetkiniz yok.');
    }
    const url = await this.storageService.getSignedDownloadUrl(attachment.fileKey);
    return { url, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async deleteAttachment(attachmentId: string, organizationId: string, userId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId, deletedAt: null },
      include: { expense: { select: { userId: true, status: true } } },
    });
    if (!attachment) throw new NotFoundAppException('Dosya');
    if (attachment.expense?.userId !== userId)
      throw new ForbiddenAppException('Yalnızca kendi dosyanızı silebilirsiniz.');
    if (attachment.expense?.status !== 'DRAFT')
      throw new ConflictAppException('Yalnızca taslak masraflardaki dosyalar silinebilir.');

    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
    try {
      await this.storageService.deleteFile(attachment.fileKey);
    } catch (storageError) {
      this.logger.warn('Depolama silme başarısız, DB kaydı temizlendi.', {
        attachmentId,
        fileKey: attachment.fileKey,
        error: storageError instanceof Error ? storageError.message : 'UnknownError',
      });
    }
  }

  async listForExpense(expenseId: string, organizationId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
      select: { userId: true },
    });
    if (!expense) throw new NotFoundAppException('Masraf');
    if (expense.userId !== userId) {
      const me = await this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { role: true },
      });
      if (!me || (me.role !== 'MANAGER' && me.role !== 'ADMIN'))
        throw new ForbiddenAppException('Bu masrafa erişim yetkiniz yok.');
    }
    return this.prisma.attachment.findMany({
      where: { expenseId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
