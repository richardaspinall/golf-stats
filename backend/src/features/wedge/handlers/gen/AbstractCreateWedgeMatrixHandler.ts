import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { createWedgeMatrixPayloadSchema, createWedgeMatrixResponseSchema, type CreateWedgeMatrixPayload, type CreateWedgeMatrixResponse } from '../../contracts.js';

export abstract class AbstractCreateWedgeMatrixHandler extends BaseHandler<CreateWedgeMatrixPayload, CreateWedgeMatrixResponse> {
  protected readonly payloadSchema = createWedgeMatrixPayloadSchema;
  protected readonly outputSchema = createWedgeMatrixResponseSchema;
}
