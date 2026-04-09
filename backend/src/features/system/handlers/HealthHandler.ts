import type { AppError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import { AbstractHealthHandler } from './gen/AbstractHealthHandler.js';

class HealthHandler extends AbstractHealthHandler {
  protected async getResult(): Promise<ResultSuccess<{ ok: true }> | ResultError<AppError>> {
    return this.ok<{ ok: true }>({ ok: true });
  }
}

export { HealthHandler };
