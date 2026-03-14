import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const now = Date.now();
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    this.logger.log(
      `→ ${request.method} ${request.url} [${controller}.${handler}]`,
    );

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        this.logger.log(
          `← ${request.method} ${request.url} ${response.statusCode} ${ms}ms`,
        );
      }),
      catchError((err) => {
        const ms = Date.now() - now;
        const status = err?.status ?? 500;
        this.logger.error(
          `← ${request.method} ${request.url} ${status} ${ms}ms [${controller}.${handler}] — ${err?.message}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
