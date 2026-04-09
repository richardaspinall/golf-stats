import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { UpdateRoundScoreOutput as UpdateRoundScoreResponse, UpdateRoundScorePayload } from '../../../api/gen/rounds/types/UpdateRoundScore.js';
import { RoundsService } from '../RoundsService.js';
import { AbstractUpdateRoundScoreHandler } from './gen/AbstractUpdateRoundScoreHandler.js';

class UpdateRoundScoreHandler extends AbstractUpdateRoundScoreHandler {
  protected async getResult(payload: UpdateRoundScorePayload): Promise<ResultSuccess<UpdateRoundScoreResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    try {
      const round = await RoundsService.updateRoundScore(this.ctx.authUser.id, payload.round, payload.hole, payload.score);
      if (!round) {
        return this.fail(new NotFoundError('Round not found'));
      }

      return this.ok<UpdateRoundScoreResponse>({ ok: true, round });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { UpdateRoundScoreHandler };
