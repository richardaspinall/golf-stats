import { GOOGLE_AUTH_CONFIGURED, AUTH_CONFIGURED } from '../../../config/env.js';
import { verifyGoogleIdToken } from '../../../auth/google.js';
import type { AppError } from '../../../app/http/AppError.js';
import { ConfigurationError, ForbiddenError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { AuthSuccessResponse, GoogleLoginPayload } from '../contracts.js';
import { AuthService } from '../AuthService.js';
import { UserRepository } from '../../users/UserRepository.js';
import { AbstractGoogleLoginHandler } from './gen/AbstractGoogleLoginHandler.js';

class GoogleLoginHandler extends AbstractGoogleLoginHandler {
  protected async getResult(payload: GoogleLoginPayload): Promise<ResultSuccess<AuthSuccessResponse> | ResultError<AppError>> {
    if (!AUTH_CONFIGURED || !GOOGLE_AUTH_CONFIGURED) {
      return this.fail(new ConfigurationError('Google auth is not configured on the server'));
    }

    try {
      const idToken = String(payload.idToken || '').trim();
      if (!idToken) {
        return this.fail(new ValidationError('Missing Google credential'));
      }

      const profile = await verifyGoogleIdToken(idToken);
      const user = await UserRepository.findGoogleLinkedUser(profile);
      if (!user) {
        return this.fail(new ForbiddenError('That Google account is not linked to an existing user'));
      }

      const auth = AuthService.issueToken(user);
      return this.ok<AuthSuccessResponse>({ ok: true, user, ...auth });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Google credential';
      return this.fail(new UnauthorizedError(message || 'Invalid Google credential'));
    }
  }
}

export { GoogleLoginHandler };
