import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { createCoursePayloadSchema, createCourseResponseSchema, type CreateCoursePayload, type CreateCourseResponse } from '../../contracts.js';

export abstract class AbstractCreateCourseHandler extends BaseHandler<CreateCoursePayload, CreateCourseResponse> {
  protected readonly payloadSchema = createCoursePayloadSchema;
  protected readonly outputSchema = createCourseResponseSchema;
}
