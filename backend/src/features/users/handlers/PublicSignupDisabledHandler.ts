import type { AppError } from '../../../app/http/AppError.js';
import { ForbiddenError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import { AbstractPublicSignupDisabledHandler } from './gen/AbstractPublicSignupDisabledHandler.js';

class PublicSignupDisabledHandler extends AbstractPublicSignupDisabledHandler {
  protected async getResult(): Promise<ResultSuccess<{ ok: true }> | ResultError<AppError>> {
    return this.fail(new ForbiddenError('Public signup is disabled'));
  }
}

export { PublicSignupDisabledHandler };
