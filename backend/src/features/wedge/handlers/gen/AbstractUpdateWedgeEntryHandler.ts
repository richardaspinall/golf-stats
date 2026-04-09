import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { updateWedgeEntryPayloadSchema, updateWedgeEntryResponseSchema, type UpdateWedgeEntryPayload, type UpdateWedgeEntryResponse } from '../../contracts.js';

export abstract class AbstractUpdateWedgeEntryHandler extends BaseHandler<UpdateWedgeEntryPayload, UpdateWedgeEntryResponse> {
  protected readonly payloadSchema = updateWedgeEntryPayloadSchema;
  protected readonly outputSchema = updateWedgeEntryResponseSchema;
}
