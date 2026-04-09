import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { DeleteClubActualEntryResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractDeleteClubActualEntryHandler } from './gen/AbstractDeleteClubActualEntryHandler.js';

class DeleteClubActualEntryHandler extends AbstractDeleteClubActualEntryHandler {
  protected async getResult(): Promise<ResultSuccess<DeleteClubActualEntryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const entryId = Number(this.params['0']);
    if (!Number.isFinite(entryId) || entryId <= 0) return this.fail(new ValidationError('Invalid entry id'));
    const deleted = await ClubRepository.deleteActualEntry(entryId, this.ctx.authUser.id);
    if (!deleted) return this.fail(new NotFoundError('Entry not found'));
    return this.ok({ ok: true });
  }
}

export { DeleteClubActualEntryHandler };
