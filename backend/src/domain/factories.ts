import type { Course, CourseMarkersByHole, Round, StatsByHole } from './types.js';
import { sanitizeCourseMarkers, sanitizeRoundDate, sanitizeRoundHandicap, sanitizeRoundNotes, sanitizeStats } from './sanitize.js';
import { buildInitialByHole, buildInitialCourseMarkers } from './initial.js';

export { buildInitialByHole, buildInitialCourseMarkers } from './initial.js';

export const createRound = (
  userId: string,
  name: string,
  roundDate: string,
  handicap: number,
  statsByHole: StatsByHole,
  notes: string[] | string = '',
): Round => {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    userId,
    name,
    roundDate: sanitizeRoundDate(roundDate),
    handicap: sanitizeRoundHandicap(handicap),
    courseId: null,
    statsByHole: sanitizeStats(statsByHole),
    notes: sanitizeRoundNotes(notes),
    createdAt: now,
    updatedAt: now,
  };
};

export const createCourse = (name: string, markers: CourseMarkersByHole): Course => {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    markers: sanitizeCourseMarkers(markers),
    createdAt: now,
    updatedAt: now,
  };
};
