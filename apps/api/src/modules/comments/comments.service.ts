import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { NotFoundAppException } from '../../common/exceptions/app.exception';
import type { PrismaService } from '../../database/prisma.service';

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Yorum boş olamaz.').max(1000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async addComment(expenseId: string, organizationId: string, userId: string, body: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
    });
    if (!expense) {
      throw new NotFoundAppException('Masraf');
    }
    return this.prisma.comment.create({ data: { expenseId, userId, body } });
  }

  async listForExpense(expenseId: string, organizationId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId, deletedAt: null },
    });
    if (!expense) {
      throw new NotFoundAppException('Masraf');
    }
    return this.prisma.comment.findMany({
      where: { expenseId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
