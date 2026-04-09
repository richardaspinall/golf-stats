import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { createClubActualEntryPayloadSchema, createClubActualEntryResponseSchema, type CreateClubActualEntryPayload, type CreateClubActualEntryResponse } from '../../contracts.js';

export abstract class AbstractCreateClubActualEntryHandler extends BaseHandler<CreateClubActualEntryPayload, CreateClubActualEntryResponse> {
  protected readonly payloadSchema = createClubActualEntryPayloadSchema;
  protected readonly outputSchema = createClubActualEntryResponseSchema;
}
