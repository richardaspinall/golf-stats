import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListClubActualAveragesResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractListClubActualAveragesHandler } from './gen/AbstractListClubActualAveragesHandler.js';

class ListClubActualAveragesHandler extends AbstractListClubActualAveragesHandler {
  protected async getResult(): Promise<ResultSuccess<ListClubActualAveragesResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    return this.ok({ ok: true, averagesByClub: await ClubRepository.listActualAverages(this.ctx.authUser.id) });
  }
}

export { ListClubActualAveragesHandler };
