import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

declare module 'express' {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const trustedFormat = incoming && /^[A-Za-z0-9._:-]{1,64}$/.test(incoming);
    req.requestId = trustedFormat ? incoming : uuid();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
