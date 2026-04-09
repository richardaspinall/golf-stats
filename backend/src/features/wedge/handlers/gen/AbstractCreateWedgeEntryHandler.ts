import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { createWedgeEntryPayloadSchema, createWedgeEntryResponseSchema, type CreateWedgeEntryPayload, type CreateWedgeEntryResponse } from '../../contracts.js';

export abstract class AbstractCreateWedgeEntryHandler extends BaseHandler<CreateWedgeEntryPayload, CreateWedgeEntryResponse> {
  protected readonly payloadSchema = createWedgeEntryPayloadSchema;
  protected readonly outputSchema = createWedgeEntryResponseSchema;
}
