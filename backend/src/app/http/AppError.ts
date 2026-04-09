export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly expose: boolean = true;

  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Invalid request') {
    super(message);
  }
}

export class InvalidRequestPayloadError extends AppError {
  readonly status = 400;
  readonly code = 'INVALID_REQUEST_PAYLOAD';

  constructor(message = 'Invalid request payload') {
    super(message);
  }
}

export class InvalidResponsePayloadError extends AppError {
  readonly status = 500;
  readonly code = 'INVALID_RESPONSE_PAYLOAD';
  override readonly expose = false;

  constructor(message = 'Invalid response payload') {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Not found') {
    super(message);
  }
}

export class InternalServerError extends AppError {
  readonly status = 500;
  readonly code = 'INTERNAL_SERVER_ERROR';
  override readonly expose = false;

  constructor(message = 'Internal server error') {
    super(message);
  }
}

export class ConfigurationError extends AppError {
  readonly status = 500;
  readonly code = 'CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}
