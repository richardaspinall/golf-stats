import { CHIP_OUTCOME_OPTIONS, FAIRWAY_OUTCOME_OPTIONS, GIR_OUTCOME_OPTIONS } from '../constants';
import {
  formatTrailSummary,
  getOutcomeMode,
  getRecordedDistanceFromFollowingShot,
  getScoreSummaryStyle,
  getShotLabel,
  isGreenHitOutcome,
  isOopSurface,
  summarizeCompletedHole,
} from '../domain/planner';
import type { PlannerShot, VirtualCaddyState } from '../types';

export const getShotNumber = (state: VirtualCaddyState) => state.trail.length + 1;
export const getIsFirstShot = (state: VirtualCaddyState) => state.trail.length === 0;
export const getIsPutting = (state: VirtualCaddyState) => state.actionType === 'putting';
export const getIsChipping = (state: VirtualCaddyState) => state.actionType === 'chipping';
export const getIsStandardShot = (state: VirtualCaddyState) => state.actionType === 'tee' || state.actionType === 'shot';
export const getIsTeeShot = (state: VirtualCaddyState) => state.actionType === 'tee';

export const getDisplayShotLabel = (state: VirtualCaddyState) => {
  const shotLabel = getShotLabel(getShotNumber(state), state.actionType);
  if (
    state.actionType !== 'putting' &&
    ((state.distanceMode === 'point' && state.distanceToMiddleMeters === 0) ||
      (state.distanceMode === 'hole' && state.distanceToHoleMeters === 0))
  ) {
    return 'Putting';
  }
  return shotLabel;
};

export const getDefaultOutcomeMode = (state: VirtualCaddyState, displayHolePar: number | null, longestCarry: number) =>
  state.distanceMode === 'point'
    ? state.distanceToMiddleMeters === 0
      ? 'gir'
      : 'fairway'
    : getOutcomeMode(state.distanceToHoleMeters, displayHolePar, longestCarry);

export const getOutcomeOptions = (state: VirtualCaddyState, displayHolePar: number | null, longestCarry: number) => {
  if (getIsPutting(state)) {
    return [];
  }
  if (getIsChipping(state)) {
    return CHIP_OUTCOME_OPTIONS;
  }
  const mode = state.resultModeOverride ?? getDefaultOutcomeMode(state, displayHolePar, longestCarry);
  return mode === 'fairway' ? FAIRWAY_OUTCOME_OPTIONS : GIR_OUTCOME_OPTIONS;
};

export const getCanSaveShot = (state: VirtualCaddyState) => {
  const hasResult = getIsPutting(state) ? state.puttCount != null : state.outcomeSelection != null;
  return hasResult;
};

export const getHasCustomContext = (state: VirtualCaddyState) =>
  state.surface !== (getIsTeeShot(state) ? 'tee' : 'fairway') ||
  state.lieQuality !== 'good' ||
  state.slope !== 'flat' ||
  (state.surface === 'bunker' && state.bunkerLie !== 'clean') ||
  state.temperature !== 'normal' ||
  state.windDirection !== 'none' ||
  state.windStrength !== 'calm' ||
  state.hazards.length > 0;

export const getIsHoleComplete = (state: VirtualCaddyState) =>
  state.trail.length > 0 &&
  (state.trail[state.trail.length - 1].outcomeSelection === 'puttHoled' || state.trail[state.trail.length - 1].outcomeSelection === 'girHoled');

export const getCompletionSummary = (state: VirtualCaddyState, displayHolePar: number | null) => {
  const summary = summarizeCompletedHole(state.trail, displayHolePar);
  return {
    ...summary,
    style: getScoreSummaryStyle(summary.par, summary.score),
  };
};

export const getShowOopOptions = (state: VirtualCaddyState) => {
  const previousShot = state.trail[state.trail.length - 1];
  return !getIsPutting(state) && (isOopSurface(state.surface) || (state.trail.length >= 2 && !isGreenHitOutcome(previousShot?.outcomeSelection ?? null)));
};

export const getTrailRecordedDistanceMeters = (
  trail: PlannerShot[],
  shot: PlannerShot,
  index: number,
  currentDistanceToHoleMeters: number,
  isHoleComplete: boolean,
  currentActionType?: VirtualCaddyState['actionType'],
  currentPreviousShotDistanceAdjustmentMeters?: number,
  currentPreviousShotUseFlagAdjustment?: boolean,
) => {
  if (shot.actionType === 'putting' && typeof shot.firstPuttDistanceMeters === 'number' && shot.firstPuttDistanceMeters > 0) {
    return shot.firstPuttDistanceMeters;
  }

  const nextShot = trail[index + 1];
  if (nextShot) {
    return getRecordedDistanceFromFollowingShot(shot, nextShot);
  }

  if (!isHoleComplete) {
    const isCurrentPreviousShotPreview =
      (currentActionType === 'putting' || currentActionType === 'chipping') &&
      index === trail.length - 1 &&
      (shot.outcomeSelection === 'girHit' ||
        shot.outcomeSelection === 'chipOnGreen' ||
        shot.outcomeSelection === 'girLong' ||
        shot.outcomeSelection === 'girLeft' ||
        shot.outcomeSelection === 'girRight');
    if (isCurrentPreviousShotPreview) {
      return getRecordedDistanceFromFollowingShot(shot, {
        actionType: currentActionType,
        distanceStartMeters: currentDistanceToHoleMeters,
        previousShotDistanceAdjustmentMeters: currentPreviousShotDistanceAdjustmentMeters ?? 0,
        previousShotUseFlagAdjustment: Boolean(currentPreviousShotUseFlagAdjustment),
      });
    }
    return getRecordedDistanceFromFollowingShot(shot, {
      actionType: currentActionType ?? 'shot',
      distanceStartMeters: currentDistanceToHoleMeters,
      previousShotDistanceAdjustmentMeters: currentPreviousShotDistanceAdjustmentMeters ?? 0,
      previousShotUseFlagAdjustment: false,
    });
  }

  return getRecordedDistanceFromFollowingShot(shot, null);
};

export const getTrailSummary = (shot: PlannerShot) => formatTrailSummary(shot);
