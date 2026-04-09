import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { SaveClubCarryPayload, SaveClubCarryResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractSaveClubCarryHandler } from './gen/AbstractSaveClubCarryHandler.js';

class SaveClubCarryHandler extends AbstractSaveClubCarryHandler {
  protected async getResult(payload: SaveClubCarryPayload): Promise<ResultSuccess<SaveClubCarryResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    try {
      const carryByClub = await ClubRepository.saveCarry(this.ctx.authUser.id, payload.carryByClub);
      return this.ok({ ok: true, carryByClub });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}

export { SaveClubCarryHandler };
