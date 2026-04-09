import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { UpdateWedgeEntryPayload, UpdateWedgeEntryResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractUpdateWedgeEntryHandler } from './gen/AbstractUpdateWedgeEntryHandler.js';

class UpdateWedgeEntryHandler extends AbstractUpdateWedgeEntryHandler {
  protected async getResult(payload: UpdateWedgeEntryPayload): Promise<ResultSuccess<UpdateWedgeEntryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const id = Number(this.params['0']);
    if (!Number.isFinite(id) || id <= 0) return this.fail(new ValidationError('Invalid entry id'));
    try {
      const entry = await WedgeRepository.updateEntry({
        id,
        userId: this.ctx.authUser.id,
        matrixId: Number(payload.matrixId),
        club: String(payload.club || '').trim(),
        swingClock: String(payload.swingClock || '').trim(),
        distanceMeters: payload.distanceMeters,
      });
      if (!entry) return this.fail(new NotFoundError('Entry not found'));
      return this.ok({ ok: true, entry });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { UpdateWedgeEntryHandler };
