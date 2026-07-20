import { Module } from '@nestjs/common';

import { StorageModule } from '../../storage/storage.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [StorageModule, AuditLogsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
