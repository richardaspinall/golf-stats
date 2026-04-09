import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listClubActualAveragesPayloadSchema, listClubActualAveragesResponseSchema, type ListClubActualAveragesPayload, type ListClubActualAveragesResponse } from '../../contracts.js';

export abstract class AbstractListClubActualAveragesHandler extends BaseHandler<ListClubActualAveragesPayload, ListClubActualAveragesResponse> {
  protected readonly payloadSchema = listClubActualAveragesPayloadSchema;
  protected readonly outputSchema = listClubActualAveragesResponseSchema;
}
