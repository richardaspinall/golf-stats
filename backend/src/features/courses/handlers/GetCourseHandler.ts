import type { AppError } from '../../../app/http/AppError.js';
import { NotFoundError, UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { GetCourseResponse } from '../contracts.js';
import { CourseRepository } from '../CourseRepository.js';
import { AbstractGetCourseHandler } from './gen/AbstractGetCourseHandler.js';

class GetCourseHandler extends AbstractGetCourseHandler {
  protected async getResult(): Promise<ResultSuccess<GetCourseResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const course = await CourseRepository.findById(this.params['0'] || '');
    if (!course) {
      return this.fail(new NotFoundError('Course not found'));
    }

    return this.ok<GetCourseResponse>({ ok: true, course });
  }
}

export { GetCourseHandler };
