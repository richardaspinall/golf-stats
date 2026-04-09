import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { UpdateRoundOutput as UpdateRoundResponse, UpdateRoundPayload } from '../../../api/gen/rounds/types/UpdateRound.js';
import { RoundsService } from '../RoundsService.js';
import { AbstractUpdateRoundHandler } from './gen/AbstractUpdateRoundHandler.js';

class UpdateRoundHandler extends AbstractUpdateRoundHandler {
  protected async getResult(payload: UpdateRoundPayload): Promise<ResultSuccess<UpdateRoundResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    try {
      const round = await RoundsService.updateRound(this.ctx.authUser.id, this.params['0'] || '', payload);
      if (!round) {
        return this.fail(new NotFoundError('Round not found'));
      }

      return this.ok<UpdateRoundResponse>({ ok: true, round });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { UpdateRoundHandler };
