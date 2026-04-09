import type { AppError } from './AppError.js';

export class ResultSuccess<T> {
  constructor(
    public readonly data: T,
    public readonly status = 200,
  ) {}
}

export class ResultError<E extends AppError> {
  constructor(public readonly error: E) {}
}
