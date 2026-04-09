import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listWedgeEntriesPayloadSchema, listWedgeEntriesResponseSchema, type ListWedgeEntriesPayload, type ListWedgeEntriesResponse } from '../../contracts.js';

export abstract class AbstractListWedgeEntriesHandler extends BaseHandler<ListWedgeEntriesPayload, ListWedgeEntriesResponse> {
  protected readonly payloadSchema = listWedgeEntriesPayloadSchema;
  protected readonly outputSchema = listWedgeEntriesResponseSchema;
}
