import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { authSuccessResponseSchema, loginPayloadSchema, type AuthSuccessResponse, type LoginPayload } from '../../contracts.js';

export abstract class AbstractLoginHandler extends BaseHandler<LoginPayload, AuthSuccessResponse> {
  protected readonly payloadSchema = loginPayloadSchema;
  protected readonly outputSchema = authSuccessResponseSchema;
}
