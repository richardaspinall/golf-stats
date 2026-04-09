import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { deleteWedgeEntryPayloadSchema, deleteWedgeEntryResponseSchema, type DeleteWedgeEntryPayload, type DeleteWedgeEntryResponse } from '../../contracts.js';

export abstract class AbstractDeleteWedgeEntryHandler extends BaseHandler<DeleteWedgeEntryPayload, DeleteWedgeEntryResponse> {
  protected readonly payloadSchema = deleteWedgeEntryPayloadSchema;
  protected readonly outputSchema = deleteWedgeEntryResponseSchema;
}
