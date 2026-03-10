import { getPool } from './pool.js';
import { toIso } from './utils.js';
import { sanitizeCourseMarkers, sanitizeCourseName } from '../domain/sanitize.js';
import type { Course, CourseMarkersByHole } from '../domain/types.js';

type CourseUpdate = {
  name: string;
  markers: CourseMarkersByHole;
  updatedAt: string;
};

const mapDbCourse = (row: any): Course => ({
  id: String(row.id),
  name: sanitizeCourseName(row.name),
  markers: sanitizeCourseMarkers(row.markers),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const listCourses = async () => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, markers, created_at, updated_at FROM courses ORDER BY updated_at DESC, created_at DESC',
  );

  return result.rows.map(mapDbCourse);
};

export const getCourseById = async (courseId: string) => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, markers, created_at, updated_at FROM courses WHERE id = $1 LIMIT 1',
    [courseId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDbCourse(result.rows[0]);
};

export const insertCourse = async (course: Course) => {
  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO courses (id, name, markers, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5::timestamptz)
      RETURNING id, name, markers, created_at, updated_at
    `,
    [course.id, course.name, JSON.stringify(course.markers), course.createdAt, course.updatedAt],
  );

  return mapDbCourse(result.rows[0]);
};

export const updateCourse = async (courseId: string, updates: CourseUpdate) => {
  const db = getPool();
  const result = await db.query(
    `
      UPDATE courses
      SET name = $2,
          markers = $3::jsonb,
          updated_at = $4::timestamptz
      WHERE id = $1
      RETURNING id, name, markers, created_at, updated_at
    `,
    [courseId, updates.name, JSON.stringify(updates.markers), updates.updatedAt],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDbCourse(result.rows[0]);
};
