import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

import { AttachmentsService } from './attachments.service';

// Sunucu tarafı ön-kabul sınırı; kesin boyut/tip doğrulaması servis katmanında
// yapılandırılan gerçek limitlerle (assertValidAttachment) yapılır.
const MULTER_HARD_CAP_BYTES = 20 * 1024 * 1024;

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * Dosya backend üzerinden R2'ye yüklenir (server-to-server). Tarayıcının
   * R2'ye doğrudan PUT attığı presigned-URL akışı, bazı istemcilerde Cloudflare
   * R2 ile tutarsız CORS davranışı gösterdiği için kaldırıldı.
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_HARD_CAP_BYTES },
    }),
  )
  async uploadDirect(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('expenseId') expenseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı.');
    if (!z.string().uuid().safeParse(expenseId).success) {
      throw new BadRequestException('Geçersiz masraf kimliği.');
    }
    return this.attachmentsService.uploadDirect(user.organizationId, user.id, expenseId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.getDownloadUrl(id, user.organizationId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.attachmentsService.deleteAttachment(id, user.organizationId, user.id);
  }

  @Get('expense/:expenseId')
  async listForExpense(
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.listForExpense(expenseId, user.organizationId, user.id);
  }
}
