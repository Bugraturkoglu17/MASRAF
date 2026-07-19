import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Standart hata gövdesi (statusCode/code/message/details/requestId) üreten
 * ortak taban sınıf. Modüller iş kurallarına özgü hataları bundan türetir.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown[],
  ) {
    super(message, status);
  }
}

export class NotFoundAppException extends AppException {
  constructor(resource: string, code = 'NOT_FOUND') {
    super(code, `${resource} bulunamadı.`, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Bu işlem için yetkiniz yok.', code = 'FORBIDDEN') {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictAppException extends AppException {
  constructor(message: string, code = 'CONFLICT') {
    super(code, message, HttpStatus.CONFLICT);
  }
}

export class ValidationAppException extends AppException {
  constructor(details: unknown[], message = 'Gönderilen bilgiler geçersiz.') {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, details);
  }
}
