import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload && 'message' in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(', ')
              : String(payload.message)
            : exception.message;
      const code =
        typeof payload === 'object' && payload && 'code' in payload
          ? String(payload.code)
          : exception.name.replace(/Error$/, '').toUpperCase() || 'HTTP_ERROR';

      response.status(status).json({
        success: false,
        error: { code, message },
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
}
