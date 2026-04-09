import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListWedgeEntriesResponse } from '../contracts.js';
import { WedgeRepository } from '../WedgeRepository.js';
import { AbstractListWedgeEntriesHandler } from './gen/AbstractListWedgeEntriesHandler.js';

class ListWedgeEntriesHandler extends AbstractListWedgeEntriesHandler {
  protected async getResult(): Promise<ResultSuccess<ListWedgeEntriesResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) return this.fail(new UnauthorizedError('Unauthorized'));
    const matrixIdRaw = this.ctx.url.searchParams.get('matrixId');
    const matrixId = matrixIdRaw ? Number(matrixIdRaw) : null;
    return this.ok({ ok: true, entries: await WedgeRepository.listEntries(this.ctx.authUser.id, matrixId) });
  }
}
export { ListWedgeEntriesHandler };
