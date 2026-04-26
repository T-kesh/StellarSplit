import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';


import { ApiErrorResponseDto } from '../dto/api-error-response.dto';
import { ErrorCodes } from '../errors/error-codes';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status = exception.getStatus();
    const correlationId = request.correlationId;

    const errorResponse: ApiErrorResponseDto = {
      code: this.mapStatusToCode(status),
      message: exception.message,
      correlationId,
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400: return ErrorCodes.VALIDATION_ERROR;
      case 401: return ErrorCodes.UNAUTHORIZED;
      case 403: return ErrorCodes.FORBIDDEN;
      case 404: return ErrorCodes.NOT_FOUND;
      case 409: return ErrorCodes.CONFLICT;
      default: return ErrorCodes.UNKNOWN_ERROR;
    }
  }
}


@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<any>();
        const request = ctx.getRequest<any>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        this.logger.error(
            `HTTP Error: ${status} - Method: ${request.method} - URL: ${request.url}`,
            exception instanceof Error ? exception.stack : '',
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message,
        });
    }
}
