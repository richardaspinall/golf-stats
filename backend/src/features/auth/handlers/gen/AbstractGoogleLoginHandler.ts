import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { authSuccessResponseSchema, googleLoginPayloadSchema, type AuthSuccessResponse, type GoogleLoginPayload } from '../../contracts.js';

export abstract class AbstractGoogleLoginHandler extends BaseHandler<GoogleLoginPayload, AuthSuccessResponse> {
  protected readonly payloadSchema = googleLoginPayloadSchema;
  protected readonly outputSchema = authSuccessResponseSchema;
}
