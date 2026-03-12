import { SHOT_SETUP_OPTIONS } from './constants';
import { sanitizeNoteText } from './rounds';
import type { Course, HoleStats, StatsByHole } from '../types';

export const getDisplayHoleIndex = (course: Course | undefined, holeStats: HoleStats | undefined, selectedHole: number): number =>
  course?.markers?.[selectedHole]?.holeIndex ?? holeStats?.holeIndex ?? selectedHole;

export const updateHoleCounter = (
  statsByHole: StatsByHole,
  hole: number,
  statKey: string,
  delta: number,
): StatsByHole => ({
  ...statsByHole,
  [hole]: {
    ...statsByHole[hole],
    [statKey]: Math.max(0, Number(statsByHole[hole][statKey] ?? 0) + delta),
  },
});

export const toggleHoleSelection = (
  statsByHole: StatsByHole,
  hole: number,
  statKey: 'fairwaySelection' | 'girSelection',
  nextValue: string,
): StatsByHole => ({
  ...statsByHole,
  [hole]: {
    ...statsByHole[hole],
    [statKey]: statsByHole[hole][statKey] === nextValue ? null : nextValue,
  },
});

export const updateHoleScoreValue = (statsByHole: StatsByHole, hole: number, delta: number): StatsByHole => ({
  ...statsByHole,
  [hole]: {
    ...statsByHole[hole],
    score: Math.max(0, statsByHole[hole].score + delta),
  },
});

type BuildShotSummaryOptions = {
  targetDistanceMeters: number;
  actualDistanceMeters: number;
  offlineMeters: number | null;
  clubSelection: string;
  lieSelection: string;
  setupSelection: string;
  swingClock: string;
};

export const buildShotSummary = ({
  targetDistanceMeters,
  actualDistanceMeters,
  offlineMeters,
  clubSelection,
  lieSelection,
  setupSelection,
  swingClock,
}: BuildShotSummaryOptions): string => {
  const selectedSetup = SHOT_SETUP_OPTIONS.find((option) => option.key === setupSelection);
  const setupText = selectedSetup ? selectedSetup.label : 'No setup notes';
  const clubText = clubSelection || 'No club selected';
  const lieText = lieSelection || 'No lie selected';
  const targetText = targetDistanceMeters > 0 ? `Target ${targetDistanceMeters}m` : null;
  const offlineText =
    offlineMeters == null
      ? null
      : offlineMeters === 0
        ? 'On line'
        : `Offline ${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`;
  const swingText = swingClock ? `Swing ${swingClock}` : 'No swing clock';

  return sanitizeNoteText(
    [
      targetText,
      `Actual ${actualDistanceMeters}m`,
      offlineText,
      clubText,
      `Lie ${lieText}`,
      setupText,
      swingText,
    ]
      .filter(Boolean)
      .join(' | '),
  );
};
