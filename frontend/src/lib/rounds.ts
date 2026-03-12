import {
  CLUB_OPTIONS,
  COUNTER_OPTIONS,
  HOLES,
  SWING_CLOCK_OPTIONS,
  TOTAL_OPTIONS,
  VALID_FAIRWAY_KEYS,
  VALID_GIR_KEYS,
} from './constants';
import { sanitizeLatLng } from './geometry';
import type { CarryByClub, CourseMarkers, HoleStats, RoundSummaryTotals, StatsByHole, WedgeEntry, WedgeMatrix } from '../types';

export const sanitizeNoteText = (raw: unknown): string =>
  String(raw || '')
    .trim()
    .slice(0, 1000);

export const sanitizeNotesList = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((note) => sanitizeNoteText(note)).filter(Boolean).slice(0, 300);
};

export const emptyHoleStats = (): HoleStats =>
  COUNTER_OPTIONS.reduce(
    (acc, option) => {
      acc[option.key] = 0;
      return acc;
    },
    { score: 0, holeIndex: 1, fairwaySelection: null, girSelection: null, teePosition: null, greenPosition: null } as HoleStats,
  );

export const emptyTotals = (): RoundSummaryTotals =>
  TOTAL_OPTIONS.reduce((acc, option) => {
    acc[option.key] = 0;
    return acc;
  }, { score: 0, par: 0, stableford: 0 } as RoundSummaryTotals);

export const sanitizeRoundHandicap = (rawValue: unknown): number | '' => {
  if (rawValue === '') {
    return '';
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return '';
  }

  return Math.min(54, Math.max(0, Math.round(value)));
};

const getHandicapStrokesForHole = (handicap: number, holeIndex: number): number => {
  if (handicap <= 0) {
    return 0;
  }

  const baseStrokes = Math.floor(handicap / 18);
  const remainder = handicap % 18;
  return baseStrokes + (remainder > 0 && holeIndex <= remainder ? 1 : 0);
};

const computeStablefordPoints = (score: number, par: number, handicapStrokes: number): number => {
  if (score <= 0 || par <= 0) {
    return 0;
  }

  return Math.max(0, par + 2 - score + handicapStrokes);
};

export const buildInitialByHole = (): StatsByHole =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = {
      ...emptyHoleStats(),
      holeIndex: hole,
    };
    return acc;
  }, {} as StatsByHole);

export const buildInitialCourseMarkers = (): CourseMarkers =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = { teePosition: null, greenPosition: null, holeIndex: hole, par: 4 };
    return acc;
  }, {} as CourseMarkers);

export const computeTotalsForStats = (
  statsByHole: StatsByHole,
  courseMarkers?: CourseMarkers,
  handicap = 0,
): RoundSummaryTotals =>
  HOLES.reduce(
    (acc, hole) => {
      const score = Number(statsByHole[hole]?.score || 0);
      const par = Number(courseMarkers?.[hole]?.par || 0);
      const holeIndex = Number(courseMarkers?.[hole]?.holeIndex || hole);

      acc.score += score;
      acc.par += par;
      acc.stableford += computeStablefordPoints(score, par, getHandicapStrokesForHole(handicap, holeIndex));
      COUNTER_OPTIONS.forEach(({ key }) => {
        acc[key] += Number(statsByHole[hole]?.[key] || 0);
      });

      const fairwaySelection = statsByHole[hole]?.fairwaySelection;
      if (fairwaySelection && VALID_FAIRWAY_KEYS.has(fairwaySelection)) {
        acc[fairwaySelection] += 1;
      }

      const girSelection = statsByHole[hole]?.girSelection;
      if (girSelection && VALID_GIR_KEYS.has(girSelection)) {
        acc[girSelection] += 1;
      }

      return acc;
    },
    emptyTotals(),
  );

export const sanitizeStats = (raw: unknown): StatsByHole => {
  const safe = buildInitialByHole();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const rawStats = (raw as StatsByHole)[hole];
    if (!rawStats || typeof rawStats !== 'object') {
      return;
    }

    COUNTER_OPTIONS.forEach(({ key }) => {
      const value = Number(rawStats[key]);
      safe[hole][key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    const score = Number(rawStats.score);
    safe[hole].score = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;

    const holeIndex = Number(rawStats.holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex) ? Math.min(18, Math.max(1, Math.floor(holeIndex))) : hole;

    const fairwaySelection = rawStats.fairwaySelection;
    safe[hole].fairwaySelection =
      typeof fairwaySelection === 'string' && VALID_FAIRWAY_KEYS.has(fairwaySelection) ? fairwaySelection : null;

    const girSelection = rawStats.girSelection;
    safe[hole].girSelection = typeof girSelection === 'string' && VALID_GIR_KEYS.has(girSelection) ? girSelection : null;

    safe[hole].teePosition = sanitizeLatLng(rawStats.teePosition);
    safe[hole].greenPosition = sanitizeLatLng(rawStats.greenPosition);
  });

  return safe;
};

export const sanitizeCourseMarkers = (raw: unknown): CourseMarkers => {
  const safe = buildInitialCourseMarkers();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const holeRaw = (raw as CourseMarkers)[hole];
    if (!holeRaw || typeof holeRaw !== 'object') {
      return;
    }

    safe[hole].teePosition = sanitizeLatLng(holeRaw.teePosition);
    safe[hole].greenPosition = sanitizeLatLng(holeRaw.greenPosition);
    const holeIndex = Number(holeRaw.holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex) ? Math.min(18, Math.max(1, Math.floor(holeIndex))) : hole;
    const par = Number(holeRaw.par);
    safe[hole].par = Number.isFinite(par) ? Math.min(6, Math.max(3, Math.floor(par))) : 4;
  });

  return safe;
};

export const sanitizeCarryMeters = (rawValue: unknown): number | '' => {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    return '';
  }

  return Math.min(400, Math.round(value));
};

export const sanitizeCarryByClub = (raw: unknown): CarryByClub => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return CLUB_OPTIONS.reduce((acc, club) => {
    const sanitized = sanitizeCarryMeters((raw as Record<string, unknown>)[club]);
    if (sanitized !== '') {
      acc[club] = sanitized;
    }
    return acc;
  }, {} as CarryByClub);
};

export const sanitizeWedgeEntry = (entry: unknown): WedgeEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const raw = entry as WedgeEntry;
  const distanceMeters = Number(raw.distanceMeters);
  const id = Number(raw.id);
  const matrixId = Number(raw.matrixId);

  if (!CLUB_OPTIONS.includes(raw.club)) {
    return null;
  }
  if (typeof raw.swingClock !== 'string' || !raw.swingClock.trim()) {
    return null;
  }
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }
  if (!Number.isFinite(id) || !Number.isFinite(matrixId)) {
    return null;
  }

  return {
    id: Math.floor(id),
    matrixId: Math.floor(matrixId),
    club: raw.club,
    swingClock: raw.swingClock.trim().slice(0, 40),
    distanceMeters: Math.round(distanceMeters),
    createdAt: String(raw.createdAt || ''),
  };
};

export const normalizeWedgeMatrix = (matrix: unknown): WedgeMatrix => {
  const raw = (matrix || {}) as WedgeMatrix;
  const swingClocks =
    Array.isArray(raw.swingClocks) && raw.swingClocks.length > 0
      ? raw.swingClocks.map((clock) => String(clock || '').trim().slice(0, 40)).filter((clock, index, arr) => Boolean(clock) && arr.indexOf(clock) === index)
      : SWING_CLOCK_OPTIONS;
  return {
    id: Number(raw.id),
    name: String(raw.name || ''),
    stanceWidth: String(raw.stanceWidth || ''),
    grip: String(raw.grip || ''),
    ballPosition: String(raw.ballPosition || ''),
    notes: String(raw.notes || ''),
    clubs: Array.isArray(raw.clubs) ? raw.clubs : [],
    swingClocks,
    createdAt: String(raw.createdAt || ''),
  };
};
