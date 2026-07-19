import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppException } from '../exceptions/app.exception';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown[];
  requestId: string;
  timestamp: string;
}

/**
 * Tüm hataları /api standardına dönüştürür. Production'da beklenmeyen
 * hataların stack trace'i istemciye asla gönderilmez, yalnızca sunucu
 * loguna yazılır.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId ?? 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Beklenmeyen bir hata oluştu.';
    let details: unknown[] | undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = HttpStatus[status] ?? 'HTTP_ERROR';
      message = exception.message || message;
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        // NestJS'in kendi HttpException'ları { message, error } döner;
        // @nestjs/terminus gibi kütüphaneler farklı bir gövde (ör. { status,
        // info, error: {...checks} }) üretebilir — `error` orada string
        // olmayabilir, bu yüzden yalnızca string ise code olarak kullanılır.
        const objBody = body as { message?: string | string[]; error?: unknown; details?: unknown };
        if (Array.isArray(objBody.message)) {
          message = 'Gönderilen bilgiler geçersiz.';
          details = objBody.message;
        } else if (typeof objBody.message === 'string') {
          message = objBody.message;
        }
        if (typeof objBody.error === 'string') {
          code = objBody.error;
        } else if (objBody.error && typeof objBody.error === 'object') {
          details = [objBody.error];
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack, requestId);
      if (!isProduction) {
        message = exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error(`[${requestId}] ${message}`, (exception as Error)?.stack);
    }

    const errorBody: ErrorBody = {
      statusCode: status,
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorBody);
  }
}
