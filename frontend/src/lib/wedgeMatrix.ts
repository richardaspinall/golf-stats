import { CLUB_OPTIONS, SWING_CLOCK_OPTIONS } from './constants';
import type { WedgeEntry } from '../types';

export type WedgeMatrixRow = {
  club: string;
  cells: Array<{ clock: string; avgMeters: number | null; count: number }>;
};

export const sortClubsByDefaultOrder = (clubs: string[]): string[] => {
  if (!Array.isArray(clubs) || clubs.length === 0) {
    return CLUB_OPTIONS;
  }

  return Array.from(new Set(clubs.filter((club) => CLUB_OPTIONS.includes(club)))).sort(
    (a, b) => CLUB_OPTIONS.indexOf(a) - CLUB_OPTIONS.indexOf(b),
  );
};

export const buildWedgeMatrixRows = (entries: WedgeEntry[], clubs: string[], swingClocks: string[]): WedgeMatrixRow[] => {
  const clubsForMatrix = sortClubsByDefaultOrder(clubs);
  const clocksForMatrix =
    Array.isArray(swingClocks) && swingClocks.length > 0
      ? swingClocks.map((clock) => String(clock || '').trim()).filter((clock, index, arr) => Boolean(clock) && arr.indexOf(clock) === index)
      : SWING_CLOCK_OPTIONS;
  const buckets = clubsForMatrix.reduce((acc, club) => {
    acc[club] = clocksForMatrix.reduce((clockAcc, clock) => {
      clockAcc[clock] = { total: 0, count: 0 };
      return clockAcc;
    }, {} as Record<string, { total: number; count: number }>);
    return acc;
  }, {} as Record<string, Record<string, { total: number; count: number }>>);

  entries.forEach((entry) => {
    if (!CLUB_OPTIONS.includes(entry.club) || !clocksForMatrix.includes(entry.swingClock)) {
      return;
    }
    if (!Number.isFinite(entry.distanceMeters) || entry.distanceMeters <= 0) {
      return;
    }
    const bucket = buckets[entry.club]?.[entry.swingClock];
    if (!bucket) {
      return;
    }
    bucket.total += entry.distanceMeters;
    bucket.count += 1;
  });

  return clubsForMatrix.map((club) => ({
    club,
    cells: clocksForMatrix.map((clock) => {
      const bucket = buckets[club][clock];
      if (!bucket || bucket.count === 0) {
        return { clock, avgMeters: null, count: 0 };
      }
      return {
        clock,
        avgMeters: Math.round(bucket.total / bucket.count),
        count: bucket.count,
      };
    }),
  }));
};
