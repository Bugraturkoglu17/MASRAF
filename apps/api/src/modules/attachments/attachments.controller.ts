import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { AttachmentsService } from './attachments.service';

const uploadUrlSchema = z.object({
  expenseId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

const completeSchema = z.object({
  expenseId: z.string().uuid(),
  fileKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileHash: z.string().optional(),
});

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload-url')
  async requestUploadUrl(
    @Body(new ZodValidationPipe(uploadUrlSchema)) body: z.infer<typeof uploadUrlSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.requestUploadUrl(
      user.organizationId,
      user.id,
      body.expenseId,
      body.fileName,
      body.mimeType,
      body.fileSize,
    );
  }

  @Post('complete')
  async completeUpload(
    @Body(new ZodValidationPipe(completeSchema)) body: z.infer<typeof completeSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.completeUpload(
      user.organizationId,
      user.id,
      body.expenseId,
      body.fileKey,
      body.fileName,
      body.mimeType,
      body.fileSize,
      body.fileHash,
    );
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
