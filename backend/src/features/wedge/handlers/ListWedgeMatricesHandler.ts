import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListWedgeMatricesResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractListWedgeMatricesHandler } from './gen/AbstractListWedgeMatricesHandler.js';

class ListWedgeMatricesHandler extends AbstractListWedgeMatricesHandler {
  protected async getResult(): Promise<ResultSuccess<ListWedgeMatricesResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    return this.ok({ ok: true, matrices: await WedgeRepository.listMatrices(this.ctx.authUser.id) });
  }
}
export { ListWedgeMatricesHandler };
