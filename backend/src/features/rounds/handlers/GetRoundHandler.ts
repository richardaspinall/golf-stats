import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { GetRoundOutput as GetRoundResponse } from '../../../api/gen/rounds/types/GetRound.js';
import { RoundRepository } from '../RoundRepository.js';
import { AbstractGetRoundHandler } from './gen/AbstractGetRoundHandler.js';

class GetRoundHandler extends AbstractGetRoundHandler {
  protected async getResult(): Promise<ResultSuccess<GetRoundResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const round = await RoundRepository.findById(this.params['0'] || '', this.ctx.authUser.id);
    if (!round) {
      return this.fail(new NotFoundError('Round not found'));
    }

    return this.ok<GetRoundResponse>({ ok: true, round });
  }
}

export { GetRoundHandler };
