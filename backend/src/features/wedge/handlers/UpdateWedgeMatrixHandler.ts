import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { UpdateWedgeMatrixPayload, UpdateWedgeMatrixResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractUpdateWedgeMatrixHandler } from './gen/AbstractUpdateWedgeMatrixHandler.js';

class UpdateWedgeMatrixHandler extends AbstractUpdateWedgeMatrixHandler {
  protected async getResult(payload: UpdateWedgeMatrixPayload): Promise<ResultSuccess<UpdateWedgeMatrixResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const id = Number(this.params['0']);
    if (!Number.isFinite(id) || id <= 0) return this.fail(new ValidationError('Invalid matrix id'));
    try {
      const matrix = await WedgeRepository.updateMatrix({
        id,
        userId: this.ctx.authUser.id,
        name: String(payload.name || '').trim(),
        stanceWidth: String(payload.stanceWidth || '').trim(),
        grip: String(payload.grip || '').trim(),
        ballPosition: String(payload.ballPosition || '').trim(),
        notes: String(payload.notes || '').trim(),
        clubs: Array.isArray(payload.clubs) ? payload.clubs : [],
        swingClocks: Array.isArray(payload.swingClocks) ? payload.swingClocks : [],
      });
      if (!matrix) return this.fail(new NotFoundError('Matrix not found'));
      return this.ok({ ok: true, matrix });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { UpdateWedgeMatrixHandler };
