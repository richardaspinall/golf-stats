import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listClubActualEntriesPayloadSchema, listClubActualEntriesResponseSchema, type ListClubActualEntriesPayload, type ListClubActualEntriesResponse } from '../../contracts.js';

export abstract class AbstractListClubActualEntriesHandler extends BaseHandler<ListClubActualEntriesPayload, ListClubActualEntriesResponse> {
  protected readonly payloadSchema = listClubActualEntriesPayloadSchema;
  protected readonly outputSchema = listClubActualEntriesResponseSchema;
}
