import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { deleteWedgeMatrixPayloadSchema, deleteWedgeMatrixResponseSchema, type DeleteWedgeMatrixPayload, type DeleteWedgeMatrixResponse } from '../../contracts.js';

export abstract class AbstractDeleteWedgeMatrixHandler extends BaseHandler<DeleteWedgeMatrixPayload, DeleteWedgeMatrixResponse> {
  protected readonly payloadSchema = deleteWedgeMatrixPayloadSchema;
  protected readonly outputSchema = deleteWedgeMatrixResponseSchema;
}
