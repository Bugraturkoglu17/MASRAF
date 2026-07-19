import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import type { CommentsService } from './comments.service';
import { createCommentSchema, type CreateCommentInput } from './comments.service';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('expenses/:expenseId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createCommentSchema))
  async create(
    @Param('expenseId') expenseId: string,
    @Body() body: CreateCommentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.addComment(expenseId, user.organizationId, user.id, body.body);
  }

  @Get()
  async list(@Param('expenseId') expenseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.listForExpense(expenseId, user.organizationId);
  }
}
