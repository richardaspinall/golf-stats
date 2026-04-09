import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listWedgeMatricesPayloadSchema, listWedgeMatricesResponseSchema, type ListWedgeMatricesPayload, type ListWedgeMatricesResponse } from '../../contracts.js';

export abstract class AbstractListWedgeMatricesHandler extends BaseHandler<ListWedgeMatricesPayload, ListWedgeMatricesResponse> {
  protected readonly payloadSchema = listWedgeMatricesPayloadSchema;
  protected readonly outputSchema = listWedgeMatricesResponseSchema;
}
