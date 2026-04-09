import type { AppError } from '../../../app/http/AppError.js';
import { UnauthorizedError } from '../../../app/http/AppError.js';
import type { ResultError, ResultSuccess } from '../../../app/http/HandlerResult.js';
import type { ListCoursesResponse } from '../contracts.js';
import { CourseRepository } from '../CourseRepository.js';
import { AbstractListCoursesHandler } from './gen/AbstractListCoursesHandler.js';

class ListCoursesHandler extends AbstractListCoursesHandler {
  protected async getResult(): Promise<ResultSuccess<ListCoursesResponse> | ResultError<AppError>> {
    if (!this.ctx.authUser) {
      return this.fail(new UnauthorizedError('Unauthorized'));
    }

    const courses = await CourseRepository.list();
    return this.ok<ListCoursesResponse>({ ok: true, courses });
  }
}

export { ListCoursesHandler };
