import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { UpdateCoursePayload, UpdateCourseResponse } from '../contracts.js';
import { CoursesService } from '../CoursesService.js';
import { AbstractUpdateCourseHandler } from './gen/AbstractUpdateCourseHandler.js';

class UpdateCourseHandler extends AbstractUpdateCourseHandler {
  protected async getResult(payload: UpdateCoursePayload): Promise<ResultSuccess<UpdateCourseResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    try {
      const course = await CoursesService.updateCourse(this.params['0'] || '', payload);
      if (!course) {
        return this.fail(new NotFoundError('Course not found'));
      }

      return this.ok<UpdateCourseResponse>({ ok: true, course });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request';
      return this.fail(new ValidationError(message || 'Invalid request'));
    }
  }
}

export { UpdateCourseHandler };
