import { getCourseById, insertCourse, listCourses, updateCourse } from '../../db/courses.js';

export class CourseRepository {
  static list() {
    return listCourses();
  }

  static findById(courseId: string) {
    return getCourseById(courseId);
  }

  static create(course: Parameters<typeof insertCourse>[0]) {
    return insertCourse(course);
  }

  static update(courseId: string, updates: Parameters<typeof updateCourse>[1]) {
    return updateCourse(courseId, updates);
  }
}
