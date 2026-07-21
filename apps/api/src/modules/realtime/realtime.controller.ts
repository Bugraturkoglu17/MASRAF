import { Controller, Get, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { RealtimeService } from './realtime.service';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('manager')
  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  managerStream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.realtimeService.streamForOrganization(user.organizationId);
  }
}
