import type { HoleStats, PersistedVirtualCaddyState } from '../../../types';
import type { VirtualCaddyInputs } from '../../../lib/virtualCaddy';
import type { VirtualCaddyOutcomeSelection } from '../../../lib/virtualCaddyExecution';
import { WEDGE_CLUBS } from '../constants';
import type {
  PersistedPlannerDraft,
  PlannerActionType,
  PlannerShot,
  ScoreSummaryTone,
} from '../types';

export const buildComparableDraft = (draft: PersistedPlannerDraft) => {
  const { flowStep: _flowStep, ...comparableDraft } = draft;
  return comparableDraft;
};

export const stripVirtualCaddyState = (holeStats: HoleStats): HoleStats => ({
  ...holeStats,
  manualScoreEnteredOnTrack: Boolean(holeStats.manualScoreEnteredOnTrack),
  virtualCaddyState: null,
});

export const sanitizePersistedState = (value: unknown): PersistedVirtualCaddyState | null =>
  value && typeof value === 'object' && (value as PersistedVirtualCaddyState).version === 1
    ? (value as PersistedVirtualCaddyState)
    : null;

export const shouldTrackClubActual = (shot: Pick<PlannerShot, 'actionType' | 'surface' | 'club'>) =>
  shot.actionType !== 'putting' &&
  shot.actionType !== 'chipping' &&
  shot.surface !== 'bunker' &&
  shot.club !== 'Putter' &&
  shot.club !== 'Chip shot';

export const getShotLabel = (shotNumber: number, actionType: PlannerActionType) => {
  if (actionType === 'tee') {
    return 'Tee shot';
  }
  if (actionType === 'chipping') {
    return 'Chipping';
  }
  if (actionType === 'putting') {
    return 'Putting';
  }
  return `Shot ${shotNumber}`;
};

export const getSurfaceFromOutcome = (
  outcomeSelection: VirtualCaddyOutcomeSelection | null,
): NonNullable<VirtualCaddyInputs['surface']> => {
  if (outcomeSelection === 'fairwayHit' || outcomeSelection === 'fairwayShort' || outcomeSelection === 'fairwayLong') {
    return 'fairway';
  }
  if (
    outcomeSelection === 'fairwayLeft' ||
    outcomeSelection === 'fairwayRight' ||
    outcomeSelection === 'girLeft' ||
    outcomeSelection === 'girRight'
  ) {
    return 'rough';
  }
  if (outcomeSelection === 'girShort') {
    return 'fairway';
  }
  if (outcomeSelection === 'girLong' || outcomeSelection === 'chipMissGreen') {
    return 'rough';
  }
  if (outcomeSelection === 'chipOnGreen') {
    return 'fairway';
  }
  return 'fairway';
};

export const getOutcomeMode = (distanceMeters: number, displayHolePar: number | null, longestCarry: number) =>
  displayHolePar === 3 || distanceMeters <= longestCarry ? 'gir' : 'fairway';

export const getActualDistanceFromStart = (distanceStartMeters: number, remainingDistanceMeters: number) =>
  Math.max(0, distanceStartMeters - remainingDistanceMeters);

export const clampPreviousShotDistanceAdjustmentMeters = (distanceMeters: number) => Math.min(50, Math.max(-50, Math.round(distanceMeters)));

export const getAdjustedMeasuredDistanceMeters = (measuredDistanceMeters: number, adjustmentMeters: number) =>
  Math.max(0, Math.round(measuredDistanceMeters) + clampPreviousShotDistanceAdjustmentMeters(adjustmentMeters));

export const getRecordedDistanceFromFollowingShot = (
  shot: Pick<PlannerShot, 'distanceStartMeters' | 'plannedDistanceMeters' | 'remainingDistanceMeters' | 'outcomeSelection'>,
  followingShot:
    | Pick<PlannerShot, 'actionType' | 'distanceStartMeters' | 'previousShotDistanceAdjustmentMeters' | 'previousShotUseFlagAdjustment'>
    | null
    | undefined,
) => {
  if (!followingShot) {
    return getActualDistanceFromStart(shot.distanceStartMeters, shot.remainingDistanceMeters);
  }

  if (followingShot.actionType === 'putting' && (shot.outcomeSelection === 'girHit' || shot.outcomeSelection === 'chipOnGreen')) {
    return getAdjustedMeasuredDistanceMeters(shot.plannedDistanceMeters, followingShot.previousShotDistanceAdjustmentMeters ?? 0);
  }

  if (followingShot.actionType === 'chipping') {
    if (shot.outcomeSelection === 'girLong') {
      return Math.max(0, Math.round(shot.plannedDistanceMeters) + Math.round(followingShot.distanceStartMeters));
    }

    if (
      (shot.outcomeSelection === 'girLeft' || shot.outcomeSelection === 'girRight') &&
      followingShot.previousShotUseFlagAdjustment
    ) {
      return getAdjustedMeasuredDistanceMeters(shot.plannedDistanceMeters, followingShot.previousShotDistanceAdjustmentMeters ?? 0);
    }
  }

  return getActualDistanceFromStart(shot.distanceStartMeters, followingShot.distanceStartMeters);
};

export const isOopSurface = (surface: NonNullable<VirtualCaddyInputs['surface']>) => surface !== 'tee' && surface !== 'fairway';

export const isGreenHitOutcome = (outcomeSelection: VirtualCaddyOutcomeSelection | null) =>
  outcomeSelection === 'girHit' || outcomeSelection === 'girHoled' || outcomeSelection === 'chipOnGreen';

export const clampDistanceMeters = (distanceMeters: number) => Math.min(600, Math.max(0, distanceMeters));

export const formatOutcomeLabel = (outcomeSelection: VirtualCaddyOutcomeSelection | null) => {
  if (!outcomeSelection) {
    return 'No result';
  }

  const labels: Record<VirtualCaddyOutcomeSelection, string> = {
    fairwayHit: 'Fairway hit',
    fairwayLeft: 'Fairway left',
    fairwayRight: 'Fairway right',
    fairwayShort: 'Fairway short',
    fairwayLong: 'Fairway long',
    girHit: 'Green hit',
    girHoled: 'Holed',
    girLeft: 'Green left',
    girRight: 'Green right',
    girShort: 'Green short',
    girLong: 'Green long',
    chipOnGreen: 'Chip on green',
    chipMissGreen: 'Chip missed green',
    puttHoled: 'Putting complete',
  };

  return labels[outcomeSelection];
};

export const formatTrailResultLabel = (shot: PlannerShot) => {
  if (shot.actionType === 'putting' && typeof shot.puttCount === 'number' && shot.puttCount > 0) {
    return `${shot.puttCount} ${shot.puttCount === 1 ? 'putt' : 'putts'}`;
  }

  if (shot.actionType === 'tee' && shot.outcomeSelection === 'girHoled') {
    return 'Hole in one';
  }

  return formatOutcomeLabel(shot.outcomeSelection);
};

export const getOutcomePositionClass = (outcomeKey: VirtualCaddyOutcomeSelection) => {
  switch (outcomeKey) {
    case 'fairwayLong':
    case 'girLong':
      return 'long';
    case 'fairwayLeft':
    case 'girLeft':
      return 'left';
    case 'fairwayHit':
    case 'girHit':
      return 'center';
    case 'fairwayRight':
    case 'girRight':
      return 'right';
    case 'fairwayShort':
    case 'girShort':
      return 'short';
    default:
      return '';
  }
};

export const formatTrailSummary = (shot: PlannerShot) => {
  const penaltySuffix = shot.penaltyStrokes ? ` + ${shot.penaltyStrokes} penalty stroke${shot.penaltyStrokes === 1 ? '' : 's'}` : '';

  if (shot.actionType === 'putting') {
    const firstPuttDistanceSuffix =
      typeof shot.firstPuttDistanceMeters === 'number' && shot.firstPuttDistanceMeters > 0 ? ` from ${shot.firstPuttDistanceMeters}m` : '';
    return `${shot.club}: ${formatTrailResultLabel(shot)}${firstPuttDistanceSuffix}${penaltySuffix}`;
  }

  return `Started at ${shot.distanceStartMeters}m with ${shot.carryMeters}m carry. ${formatTrailResultLabel(shot)}${penaltySuffix}.`;
};

export const summarizeCompletedHole = (trail: PlannerShot[], displayHolePar: number | null) => {
  const score = trail.reduce((sum, shot) => {
    if (shot.actionType === 'putting') {
      return sum + (shot.puttCount ?? 1) + (shot.penaltyStrokes ?? 0);
    }
    return sum + 1 + (shot.penaltyStrokes ?? 0);
  }, 0);
  const puttingShot = trail.find((shot) => shot.actionType === 'putting') ?? null;

  return {
    par: displayHolePar,
    score,
    putts: puttingShot?.puttCount ?? 0,
  };
};

export const getScoreSummaryStyle = (par: number | null, score: number): { tone: ScoreSummaryTone } => {
  if (par == null) {
    return {
      tone: 'neutral',
    };
  }

  const diff = score - par;
  if (diff <= -2) {
    return { tone: 'eagle' };
  }
  if (diff === -1) {
    return { tone: 'birdie' };
  }
  if (diff === 0) {
    return { tone: 'par' };
  }
  if (diff === 1) {
    return { tone: 'bogey' };
  }
  return { tone: 'double' };
};

export const deriveOopResult = (
  actionType: PlannerActionType,
  surface: NonNullable<VirtualCaddyInputs['surface']>,
  oopResult: 'none' | 'look' | 'noLook',
) => (actionType !== 'putting' && isOopSurface(surface) ? oopResult : 'none');

export const deriveShotCategory = (
  actionType: PlannerActionType,
  surface: NonNullable<VirtualCaddyInputs['surface']>,
  distanceStartMeters: number,
  club: string,
) => {
  if (distanceStartMeters > 100) {
    return 'none';
  }
  if (actionType === 'chipping') {
    return surface === 'bunker' ? 'bunker' : 'chip';
  }
  if (surface === 'bunker') {
    return 'bunker';
  }
  if (WEDGE_CLUBS.has(club)) {
    return 'wedge';
  }
  return 'none';
};
