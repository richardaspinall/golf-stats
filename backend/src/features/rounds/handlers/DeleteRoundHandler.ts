import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { DeleteRoundOutput as DeleteRoundResponse } from '../../../api/gen/rounds/types/DeleteRound.js';
import { RoundRepository } from '../RoundRepository.js';
import { AbstractDeleteRoundHandler } from './gen/AbstractDeleteRoundHandler.js';

class DeleteRoundHandler extends AbstractDeleteRoundHandler {
  protected async getResult(): Promise<ResultSuccess<DeleteRoundResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const deleted = await RoundRepository.deleteById(this.params['0'] || '', this.ctx.authUser.id);
    if (!deleted) {
      return this.fail(new NotFoundError('Round not found'));
    }

    return this.ok<DeleteRoundResponse>({ ok: true });
  }
}

export { DeleteRoundHandler };
