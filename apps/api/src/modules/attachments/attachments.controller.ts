import { Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../storage/file-validation';

import type { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('expenses/:expenseId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @RequirePermissions({ action: PermissionAction.CREATE, resource: PermissionResource.ATTACHMENT })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES } }))
  async upload(
    @Param('expenseId') expenseId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.uploadForExpense(user.organizationId, user.id, expenseId, file);
  }
}

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentDownloadController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id/signed-url')
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.ATTACHMENT })
  async signedUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.getSignedUrl(id, user.organizationId, user.id);
  }
}
