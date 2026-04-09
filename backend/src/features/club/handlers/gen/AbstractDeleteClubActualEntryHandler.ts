import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { deleteClubActualEntryPayloadSchema, deleteClubActualEntryResponseSchema, type DeleteClubActualEntryPayload, type DeleteClubActualEntryResponse } from '../../contracts.js';

export abstract class AbstractDeleteClubActualEntryHandler extends BaseHandler<DeleteClubActualEntryPayload, DeleteClubActualEntryResponse> {
  protected readonly payloadSchema = deleteClubActualEntryPayloadSchema;
  protected readonly outputSchema = deleteClubActualEntryResponseSchema;
}
