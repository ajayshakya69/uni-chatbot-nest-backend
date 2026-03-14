import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpResponseDto } from '../dtos/http-response';
import { HTTP_RESPONSE_CODES } from '../constants/http.constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (exception?.status ?? HTTP_RESPONSE_CODES.INTERNAL_SERVER_ERROR.CODE);

    const message =
      exception?.message ?? HTTP_RESPONSE_CODES.INTERNAL_SERVER_ERROR.MESSAGE;

    const source = this.extractSource(exception);

    this.logger.error(
      `[${request.method} ${request.url}] ${status} — ${message}` +
        (source ? ` | Source: ${source}` : ''),
    );

    if (exception?.stack) {
      this.logger.error(exception.stack);
    }

    if (request.body && Object.keys(request.body).length > 0) {
      this.logger.debug(`Request body: ${JSON.stringify(request.body)}`);
    }

    const errorResponse = new HttpResponseDto();
    const statusMessage = Object.values(HTTP_RESPONSE_CODES).find(
      (code) => code.CODE === status,
    );

    const nestedResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const nestedMessage =
      typeof nestedResponse === 'object' && nestedResponse !== null
        ? (nestedResponse as any).message
        : null;

    errorResponse.meta = {
      success: false,
      statusCode: status,
      message: statusMessage
        ? statusMessage.MESSAGE
        : message,
      failures: {
        message: Array.isArray(nestedMessage)
          ? nestedMessage.join('; ')
          : (message ?? HTTP_RESPONSE_CODES.INTERNAL_SERVER_ERROR.MESSAGE),
        ...(typeof nestedResponse === 'object' && nestedResponse !== null
          ? nestedResponse
          : {}),
        ...(source ? { source } : {}),
      },
    };

    response.status(status).json(errorResponse);
  }

  private extractSource(exception: any): string | null {
    if (!exception?.stack) return null;
    const lines: string[] = exception.stack.split('\n');
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('at ') &&
        !trimmed.includes('node_modules') &&
        !trimmed.includes('node:internal')
      ) {
        return trimmed.replace(/^at\s+/, '');
      }
    }
    return null;
  }
}
