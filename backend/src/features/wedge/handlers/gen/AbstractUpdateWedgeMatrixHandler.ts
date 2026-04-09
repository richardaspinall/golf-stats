import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { updateWedgeMatrixPayloadSchema, updateWedgeMatrixResponseSchema, type UpdateWedgeMatrixPayload, type UpdateWedgeMatrixResponse } from '../../contracts.js';

export abstract class AbstractUpdateWedgeMatrixHandler extends BaseHandler<UpdateWedgeMatrixPayload, UpdateWedgeMatrixResponse> {
  protected readonly payloadSchema = updateWedgeMatrixPayloadSchema;
  protected readonly outputSchema = updateWedgeMatrixResponseSchema;
}
