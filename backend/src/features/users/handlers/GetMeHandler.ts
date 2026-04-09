import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { GetMeResponse } from '../contracts.js';
import { UserRepository } from '../UserRepository.js';
import { AbstractGetMeHandler } from './gen/AbstractGetMeHandler.js';

class GetMeHandler extends AbstractGetMeHandler {
  protected async getResult(): Promise<ResultSuccess<GetMeResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const user = await UserRepository.findById(this.ctx.authUser.id);
    if (!user) {
      return this.fail(new NotFoundError('User not found'));
    }

    return this.ok<GetMeResponse>({ ok: true, user });
  }
}

export { GetMeHandler };
