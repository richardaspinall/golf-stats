import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { CreateWedgeMatrixPayload, CreateWedgeMatrixResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractCreateWedgeMatrixHandler } from './gen/AbstractCreateWedgeMatrixHandler.js';

class CreateWedgeMatrixHandler extends AbstractCreateWedgeMatrixHandler {
  protected async getResult(payload: CreateWedgeMatrixPayload): Promise<ResultSuccess<CreateWedgeMatrixResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    try {
      const matrix = await WedgeRepository.createMatrix({
        userId: this.ctx.authUser.id,
        name: String(payload.name || '').trim(),
        stanceWidth: String(payload.stanceWidth || '').trim(),
        grip: String(payload.grip || '').trim(),
        ballPosition: String(payload.ballPosition || '').trim(),
        notes: String(payload.notes || '').trim(),
        clubs: Array.isArray(payload.clubs) ? payload.clubs : [],
        swingClocks: Array.isArray(payload.swingClocks) ? payload.swingClocks : [],
      });
      return this.ok({ ok: true, matrix }, 201);
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { CreateWedgeMatrixHandler };
