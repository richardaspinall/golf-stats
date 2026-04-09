import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { SyncVirtualCaddyActualsPayload, SyncVirtualCaddyActualsResponse } from '../contracts.js';
import { ClubRepository } from '../ClubRepository.js';
import { AbstractSyncVirtualCaddyActualsHandler } from './gen/AbstractSyncVirtualCaddyActualsHandler.js';

class SyncVirtualCaddyActualsHandler extends AbstractSyncVirtualCaddyActualsHandler {
  protected async getResult(payload: SyncVirtualCaddyActualsPayload): Promise<ResultSuccess<SyncVirtualCaddyActualsResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    try {
      const entries = await ClubRepository.replaceVirtualCaddyActuals({
        userId: this.ctx.authUser.id,
        roundId: String(payload.roundId || '').trim(),
        hole: payload.hole,
        shots: Array.isArray(payload.shots) ? payload.shots : [],
      });
      return this.ok({ ok: true, entries });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}

export { SyncVirtualCaddyActualsHandler };
