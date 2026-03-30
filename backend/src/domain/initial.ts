import { COUNTER_OPTIONS, HOLES } from '../constants.js';
import type { CourseMarkersByHole, StatsByHole } from './types.js';

export const emptyHoleStats = (): StatsByHole[number] =>
  COUNTER_OPTIONS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {
      score: 0,
      holeIndex: 1,
      fairwaySelection: null,
      girSelection: null,
      bunkerSelection: null,
      teePosition: null,
      greenPosition: null,
      virtualCaddyState: null,
    } as StatsByHole[number],
  );

export const buildInitialByHole = (): StatsByHole =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = {
      ...emptyHoleStats(),
      holeIndex: hole,
    };
    return acc;
  }, {} as StatsByHole);

export const buildInitialCourseMarkers = (): CourseMarkersByHole =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = { teePosition: null, greenPosition: null, holeIndex: hole, par: 4 };
    return acc;
  }, {} as CourseMarkersByHole);
