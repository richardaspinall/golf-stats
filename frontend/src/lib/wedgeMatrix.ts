import { CLUB_OPTIONS, SWING_CLOCK_OPTIONS } from './constants';
import type { WedgeEntry, WedgeMatrix } from '../types';

export type WedgeMatrixRow = {
  club: string;
  cells: Array<{ clock: string; avgMeters: number | null; count: number }>;
};

export type WedgeMatrixRecommendation = {
  club: string;
  swingClock: string;
  distanceMeters: number;
  sampleCount: number;
  distanceGapMeters: number;
};

export type WedgeMatrixSource = {
  matrix: Pick<WedgeMatrix, 'id' | 'name' | 'clubs' | 'swingClocks' | 'stanceWidth' | 'grip' | 'ballPosition'>;
  entries: WedgeEntry[];
};

export type WedgeMatrixMatch = {
  matrix: WedgeMatrixSource['matrix'];
  recommendation: WedgeMatrixRecommendation;
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

export const getClosestWedgeMatrixRecommendation = (
  entries: WedgeEntry[],
  clubs: string[],
  swingClocks: string[],
  targetDistanceMeters: number,
): WedgeMatrixRecommendation | null => {
  if (!Array.isArray(entries) || entries.length === 0 || !Number.isFinite(targetDistanceMeters) || targetDistanceMeters <= 0) {
    return null;
  }

  const rows = buildWedgeMatrixRows(entries, clubs, swingClocks);
  const candidates = rows.flatMap((row) =>
    row.cells
      .filter((cell) => typeof cell.avgMeters === 'number' && cell.avgMeters > 0 && cell.count > 0)
      .map((cell) => ({
        club: row.club,
        swingClock: cell.clock,
        distanceMeters: cell.avgMeters as number,
        sampleCount: cell.count,
        distanceGapMeters: Math.abs((cell.avgMeters as number) - targetDistanceMeters),
      })),
  );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.distanceGapMeters !== b.distanceGapMeters) {
      return a.distanceGapMeters - b.distanceGapMeters;
    }
    if (a.sampleCount !== b.sampleCount) {
      return b.sampleCount - a.sampleCount;
    }

    const clubOrder = CLUB_OPTIONS.indexOf(a.club) - CLUB_OPTIONS.indexOf(b.club);
    if (clubOrder !== 0) {
      return clubOrder;
    }

    return swingClocks.indexOf(a.swingClock) - swingClocks.indexOf(b.swingClock);
  });

  return candidates[0] ?? null;
};

export const getClosestWedgeMatrixRecommendationAcrossMatrices = (
  matrices: WedgeMatrixSource[],
  targetDistanceMeters: number,
): WedgeMatrixMatch | null => {
  if (!Array.isArray(matrices) || matrices.length === 0) {
    return null;
  }

  const candidates = matrices.flatMap((source) => {
    const recommendation = getClosestWedgeMatrixRecommendation(
      source.entries,
      source.matrix.clubs,
      source.matrix.swingClocks,
      targetDistanceMeters,
    );

    return recommendation ? [{ matrix: source.matrix, recommendation }] : [];
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.recommendation.distanceGapMeters !== b.recommendation.distanceGapMeters) {
      return a.recommendation.distanceGapMeters - b.recommendation.distanceGapMeters;
    }
    if (a.recommendation.sampleCount !== b.recommendation.sampleCount) {
      return b.recommendation.sampleCount - a.recommendation.sampleCount;
    }

    return a.matrix.id - b.matrix.id;
  });

  return candidates[0] ?? null;
};
