import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMemo } from 'react';

import { ApiError, createCourseInApi, updateCourseInApi } from '../lib/api';
import { HOLES } from '../lib/constants';
import type { Course } from '../types';

type UseCourseManagementArgs = {
  authToken: string;
  newCourseName: string;
  setNewCourseName: Dispatch<SetStateAction<string>>;
  courses: Course[];
  setCourses: Dispatch<SetStateAction<Course[]>>;
  courseEditorId: string;
  setCourseEditorId: Dispatch<SetStateAction<string>>;
  setSelectedCourseId: Dispatch<SetStateAction<string>>;
  setIsLoadingCourses: Dispatch<SetStateAction<boolean>>;
  setCoursesError: Dispatch<SetStateAction<string>>;
  setCourseSaveState: Dispatch<SetStateAction<string>>;
  courseEditor?: Course;
  handleAuthFailure: (message?: string) => void;
};

export function useCourseManagement({
  authToken,
  newCourseName,
  setNewCourseName,
  courses,
  setCourses,
  courseEditorId,
  setCourseEditorId,
  setSelectedCourseId,
  setIsLoadingCourses,
  setCoursesError,
  setCourseSaveState,
  courseEditor,
  handleAuthFailure,
}: UseCourseManagementArgs) {
  const createCourse = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!authToken) {
      return;
    }

    const courseName = newCourseName.trim();
    if (!courseName) {
      return;
    }

    setIsLoadingCourses(true);
    setCoursesError('');
    try {
      const course = await createCourseInApi(courseName, authToken);
      if (course) {
        setCourses((prev) => [course, ...prev]);
        setCourseEditorId(course.id);
        setSelectedCourseId(course.id);
        setNewCourseName('');
        setCourseSaveState('saved');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

      setCoursesError((error as Error)?.message || 'Failed to create course');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const saveCurrentCourse = async () => {
    if (!authToken || !courseEditorId) {
      return;
    }

    const course = courses.find((entry) => entry.id === courseEditorId);
    if (!course) {
      return;
    }

    setCourseSaveState('saving');
    try {
      const savedCourse = await updateCourseInApi(course.id, course.name, course.markers, authToken);
      if (savedCourse) {
        setCourses((prev) =>
          prev.map((entry) =>
            entry.id === course.id
              ? {
                  ...entry,
                  ...savedCourse,
                }
              : entry,
          ),
        );
      }
      setCourseSaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setCourseSaveState('error');
    }
  };

  const courseHoleIndexCounts = useMemo(() => {
    if (!courseEditor?.markers) {
      return {};
    }

    return HOLES.reduce((acc, hole) => {
      const indexValue = Number(courseEditor.markers?.[hole]?.holeIndex);
      if (!Number.isFinite(indexValue)) {
        return acc;
      }

      acc[indexValue] = (acc[indexValue] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [courseEditor]);

  return { createCourse, saveCurrentCourse, courseHoleIndexCounts };
}
