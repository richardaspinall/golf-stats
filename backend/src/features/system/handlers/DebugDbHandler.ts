import { getDbDebugStatus } from '../../../db/debug.js';
import type { AppError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import { AbstractDebugDbHandler } from './gen/AbstractDebugDbHandler.js';

type DebugDbResponse = Awaited<ReturnType<typeof getDbDebugStatus>>;

class DebugDbHandler extends AbstractDebugDbHandler {
  protected async getResult(): Promise<ResultSuccess<DebugDbResponse> | ResultError<AppError>> {
    const debug = await getDbDebugStatus();
    return this.ok(debug, debug.ok ? 200 : 500);
  }
}

export { DebugDbHandler };
