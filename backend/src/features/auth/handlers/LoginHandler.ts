import { AUTH_CONFIGURED } from '../../../config/env.js';
import type { AppError } from '../../../app/http/AppError.js';
import { ConfigurationError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { AuthSuccessResponse, LoginPayload } from '../contracts.js';
import { AuthService } from '../AuthService.js';
import { UserRepository } from '../../users/UserRepository.js';
import { AbstractLoginHandler } from './gen/AbstractLoginHandler.js';

class LoginHandler extends AbstractLoginHandler {
  protected async getResult(payload: LoginPayload): Promise<ResultSuccess<AuthSuccessResponse> | ResultError<AppError>> {
    if (!AUTH_CONFIGURED) {
      return this.fail(new ConfigurationError('Auth is not configured on the server'));
    }

    try {
      const user = await UserRepository.findByCredentials({
        username: payload.username,
        password: payload.password,
      });

      if (!user) {
        return this.fail(new UnauthorizedError('Invalid credentials'));
      }

      const auth = AuthService.issueToken(user);
      return this.ok<AuthSuccessResponse>({ ok: true, user, ...auth });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { LoginHandler };
