import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListClubActualEntriesResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractListClubActualEntriesHandler } from './gen/AbstractListClubActualEntriesHandler.js';

class ListClubActualEntriesHandler extends AbstractListClubActualEntriesHandler {
  protected async getResult(): Promise<ResultSuccess<ListClubActualEntriesResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    return this.ok({ ok: true, entries: await ClubRepository.listActualEntries(this.ctx.authUser.id) });
  }
}

export { ListClubActualEntriesHandler };
