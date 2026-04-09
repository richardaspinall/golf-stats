import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { CreateCoursePayload, CreateCourseResponse } from '../contracts.js';
import { CoursesService } from '../CoursesService.js';
import { AbstractCreateCourseHandler } from './gen/AbstractCreateCourseHandler.js';

class CreateCourseHandler extends AbstractCreateCourseHandler {
  protected async getResult(payload: CreateCoursePayload): Promise<ResultSuccess<CreateCourseResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    try {
      const course = await CoursesService.createCourse(payload);
      return this.ok<CreateCourseResponse>({ ok: true, course }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { CreateCourseHandler };
