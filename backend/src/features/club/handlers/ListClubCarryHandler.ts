import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListClubCarryResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractListClubCarryHandler } from './gen/AbstractListClubCarryHandler.js';

class ListClubCarryHandler extends AbstractListClubCarryHandler {
  protected async getResult(): Promise<ResultSuccess<ListClubCarryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    return this.ok({ ok: true, carryByClub: await ClubRepository.listCarry(this.ctx.authUser.id) });
  }
}

export { ListClubCarryHandler };
