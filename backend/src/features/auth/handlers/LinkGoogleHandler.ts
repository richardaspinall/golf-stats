import { GOOGLE_AUTH_CONFIGURED } from '../../../config/env.js';
import { verifyGoogleIdToken } from '../../../auth/google.js';
import type { AppError } from '../../../app/http/AppError.js';
import { ConfigurationError, NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { LinkGooglePayload, LinkGoogleResponse } from '../contracts.js';
import { UserRepository } from '../../users/UserRepository.js';
import { AbstractLinkGoogleHandler } from './gen/AbstractLinkGoogleHandler.js';

class LinkGoogleHandler extends AbstractLinkGoogleHandler {
  protected async getResult(payload: LinkGooglePayload): Promise<ResultSuccess<LinkGoogleResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    if (!GOOGLE_AUTH_CONFIGURED) {
      return this.fail(new ConfigurationError('Google auth is not configured on the server'));
    }

    try {
      const idToken = String(payload.idToken || '').trim();
      if (!idToken) {
        return this.fail(new ValidationError('Missing Google credential'));
      }

      const profile = await verifyGoogleIdToken(idToken);
      const user = await UserRepository.linkGoogleAccount({
        userId: this.ctx.authUser.id,
        ...profile,
      });

      if (!user) {
        return this.fail(new NotFoundError('User not found'));
      }

      return this.ok<LinkGoogleResponse>({ ok: true, user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to link Google account';
      return this.fail(new ValidationError(message || 'Unable to link Google account'));
    }
  }
}

export { LinkGoogleHandler };
