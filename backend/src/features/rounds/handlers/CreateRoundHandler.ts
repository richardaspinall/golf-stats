import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type {
  CreateRoundOutput as CreateRoundResponse,
  CreateRoundPayload,
} from '../../../api/gen/rounds/types/CreateRound.js';
import { RoundsService } from '../RoundsService.js';
import { AbstractCreateRoundHandler } from './gen/AbstractCreateRoundHandler.js';

class CreateRoundHandler extends AbstractCreateRoundHandler {
  protected async getResult(
    payload: CreateRoundPayload,
  ): Promise<ResultSuccess<CreateRoundResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    try {
      const round = await RoundsService.createRound(this.ctx.authUser.id, payload);
      return this.ok<CreateRoundResponse>({ ok: true, round }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { CreateRoundHandler };
