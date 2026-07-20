import { Controller, Get, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

import { RealtimeService } from './realtime.service';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('manager')
  @Get('manager')
  managerStream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.realtimeService.streamForOrganization(user.organizationId);
  }
}
