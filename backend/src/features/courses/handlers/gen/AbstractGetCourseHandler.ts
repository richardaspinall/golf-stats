import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { getCoursePayloadSchema, getCourseResponseSchema, type GetCoursePayload, type GetCourseResponse } from '../../contracts.js';

export abstract class AbstractGetCourseHandler extends BaseHandler<GetCoursePayload, GetCourseResponse> {
  protected readonly payloadSchema = getCoursePayloadSchema;
  protected readonly outputSchema = getCourseResponseSchema;
}
