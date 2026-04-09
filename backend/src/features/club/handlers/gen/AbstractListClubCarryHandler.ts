import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listClubCarryPayloadSchema, listClubCarryResponseSchema, type ListClubCarryPayload, type ListClubCarryResponse } from '../../contracts.js';

export abstract class AbstractListClubCarryHandler extends BaseHandler<ListClubCarryPayload, ListClubCarryResponse> {
  protected readonly payloadSchema = listClubCarryPayloadSchema;
  protected readonly outputSchema = listClubCarryResponseSchema;
}
