import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { DeleteWedgeMatrixResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractDeleteWedgeMatrixHandler } from './gen/AbstractDeleteWedgeMatrixHandler.js';

class DeleteWedgeMatrixHandler extends AbstractDeleteWedgeMatrixHandler {
  protected async getResult(): Promise<ResultSuccess<DeleteWedgeMatrixResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const id = Number(this.params['0']);
    if (!Number.isFinite(id) || id <= 0) return this.fail(new ValidationError('Invalid matrix id'));
    try {
      const deleted = await WedgeRepository.deleteMatrix(id, this.ctx.authUser.id);
      if (!deleted) return this.fail(new NotFoundError('Matrix not found'));
      return this.ok({ ok: true });
    } catch (error) {
      return this.fail(new ValidationError(error instanceof Error ? error.message : 'Invalid request'));
    }
  }
}
export { DeleteWedgeMatrixHandler };
