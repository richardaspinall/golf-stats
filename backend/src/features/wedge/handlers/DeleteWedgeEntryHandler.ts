import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { DeleteWedgeEntryResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractDeleteWedgeEntryHandler } from './gen/AbstractDeleteWedgeEntryHandler.js';

class DeleteWedgeEntryHandler extends AbstractDeleteWedgeEntryHandler {
  protected async getResult(): Promise<ResultSuccess<DeleteWedgeEntryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const id = Number(this.params['0']);
    if (!Number.isFinite(id) || id <= 0) return this.fail(new ValidationError('Invalid entry id'));
    try {
      const deleted = await WedgeRepository.deleteEntry(id, this.ctx.authUser.id);
      if (!deleted) return this.fail(new NotFoundError('Entry not found'));
      return this.ok({ ok: true });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { DeleteWedgeEntryHandler };
