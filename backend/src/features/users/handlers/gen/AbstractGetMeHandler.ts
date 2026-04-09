import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { getMePayloadSchema, getMeResponseSchema, type GetMePayload, type GetMeResponse } from '../../contracts.js';

export abstract class AbstractGetMeHandler extends BaseHandler<GetMePayload, GetMeResponse> {
  protected readonly payloadSchema = getMePayloadSchema;
  protected readonly outputSchema = getMeResponseSchema;
}
