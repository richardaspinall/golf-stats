import { buildInitialCourseMarkers, createCourse } from '../../domain/factories.js';
import { sanitizeCourseMarkers, sanitizeCourseName } from '../../domain/sanitize.js';
import { CourseRepository } from './CourseRepository.js';

export class CoursesService {
  static async createCourse(payload: unknown) {
    const body = payload as any;
    const existingCourses = await CourseRepository.list();
    const courseName = sanitizeCourseName(body?.name, existingCourses.length + 1);
    const course = createCourse(courseName, body?.markers ?? buildInitialCourseMarkers());
    return CourseRepository.create(course);
  }

  static async updateCourse(courseId: string, payload: unknown) {
    const current = await CourseRepository.findById(courseId);
    if (!current) {
      return null;
    }

    const body = payload as any;
    return CourseRepository.update(courseId, {
      name: sanitizeCourseName(body?.name ?? current.name),
      markers: sanitizeCourseMarkers(body?.markers ?? current.markers),
      updatedAt: new Date().toISOString(),
    });
  }
}
