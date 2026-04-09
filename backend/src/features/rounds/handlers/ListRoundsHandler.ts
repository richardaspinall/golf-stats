import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListRoundsOutput as ListRoundsResponse } from '../../../api/gen/rounds/types/ListRounds.js';
import { RoundRepository } from '../RoundRepository.js';
import { AbstractListRoundsHandler } from './gen/AbstractListRoundsHandler.js';

class ListRoundsHandler extends AbstractListRoundsHandler {
  protected async getResult(): Promise<ResultSuccess<ListRoundsResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const rounds = await RoundRepository.listByUserId(this.ctx.authUser.id);
    return this.ok<ListRoundsResponse>({ ok: true, rounds });
  }
}

export { ListRoundsHandler };
