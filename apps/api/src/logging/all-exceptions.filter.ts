import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id: string } }>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = isHttpException
      ? exception.getResponse()
      : { statusCode, message: 'Internal server error' };

    const logContext = {
      statusCode,
      method: request.method,
      path: request.url,
      userId: request.user?.id,
    };

    if (statusCode >= 500) {
      this.logger.error({ ...logContext, err: exception }, 'Unhandled exception');
    } else {
      this.logger.warn(logContext, isHttpException ? exception.message : 'Request failed');
    }

    response.status(statusCode).json(responseBody);
  }
}
