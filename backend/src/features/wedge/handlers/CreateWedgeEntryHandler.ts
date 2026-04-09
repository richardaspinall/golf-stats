import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { CreateWedgeEntryPayload, CreateWedgeEntryResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractCreateWedgeEntryHandler } from './gen/AbstractCreateWedgeEntryHandler.js';

class CreateWedgeEntryHandler extends AbstractCreateWedgeEntryHandler {
  protected async getResult(payload: CreateWedgeEntryPayload): Promise<ResultSuccess<CreateWedgeEntryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    try {
      const entry = await WedgeRepository.createEntry({
        userId: this.ctx.authUser.id,
        matrixId: Number(payload.matrixId),
        club: String(payload.club || '').trim(),
        swingClock: String(payload.swingClock || '').trim(),
        distanceMeters: payload.distanceMeters,
      });
      return this.ok({ ok: true, entry }, 201);
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { CreateWedgeEntryHandler };
