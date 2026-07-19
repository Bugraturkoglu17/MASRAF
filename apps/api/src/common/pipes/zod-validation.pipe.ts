import type { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

import { ValidationAppException } from '../exceptions/app.exception';

/** DTO şeması yerine paylaşılan Zod şemalarıyla body/query doğrulaması. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationAppException(details);
    }
    return result.data;
  }
}
