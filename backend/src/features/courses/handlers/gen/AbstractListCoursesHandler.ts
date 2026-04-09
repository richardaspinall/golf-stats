import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { listCoursesPayloadSchema, listCoursesResponseSchema, type ListCoursesPayload, type ListCoursesResponse } from '../../contracts.js';

export abstract class AbstractListCoursesHandler extends BaseHandler<ListCoursesPayload, ListCoursesResponse> {
  protected readonly payloadSchema = listCoursesPayloadSchema;
  protected readonly outputSchema = listCoursesResponseSchema;
}
