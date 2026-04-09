import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { CreateClubActualEntryPayload, CreateClubActualEntryResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractCreateClubActualEntryHandler } from './gen/AbstractCreateClubActualEntryHandler.js';

class CreateClubActualEntryHandler extends AbstractCreateClubActualEntryHandler {
  protected async getResult(payload: CreateClubActualEntryPayload): Promise<ResultSuccess<CreateClubActualEntryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    try {
      const entry = await ClubRepository.createActualEntry({
        userId: this.ctx.authUser.id,
        club: String(payload.club || '').trim(),
        actualMeters: payload.actualMeters,
      });
      return this.ok({ ok: true, entry }, 201);
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}

export { CreateClubActualEntryHandler };
