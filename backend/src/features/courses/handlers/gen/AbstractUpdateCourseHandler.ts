import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { updateCoursePayloadSchema, updateCourseResponseSchema, type UpdateCoursePayload, type UpdateCourseResponse } from '../../contracts.js';

export abstract class AbstractUpdateCourseHandler extends BaseHandler<UpdateCoursePayload, UpdateCourseResponse> {
  protected readonly payloadSchema = updateCoursePayloadSchema;
  protected readonly outputSchema = updateCourseResponseSchema;
}
