import type { VirtualCaddyOutcomeSelection } from '../../../lib/virtualCaddyExecution';
import type { PlannerActionType, PlannerShot, VirtualCaddyState } from '../types';
import { getSurfaceFromOutcome } from './planner';

export type ShotTransition = {
  remainingDistanceMeters: number;
  nextActionType: PlannerActionType | null;
  nextSurface: NonNullable<VirtualCaddyState['surface']>;
};

export function resolveShotTransition(
  state: Pick<VirtualCaddyState, 'actionType' | 'outcomeSelection' | 'distanceMode' | 'distanceToHoleMeters' | 'distanceToMiddleMeters'>,
  outcomeMode: 'fairway' | 'gir',
  carryMeters: number,
): ShotTransition {
  let remainingDistanceMeters =
    state.outcomeSelection === 'girHit' || state.outcomeSelection === 'girHoled' || state.outcomeSelection === 'puttHoled'
      ? 0
      : state.distanceMode === 'point'
        ? Math.max(0, state.distanceToHoleMeters - state.distanceToMiddleMeters)
        : Math.max(0, state.distanceToHoleMeters - Math.max(0, carryMeters));
  let nextActionType: PlannerActionType | null = 'shot';

  if (state.actionType === 'putting') {
    remainingDistanceMeters = 0;
    nextActionType = null;
  } else if (state.actionType === 'chipping') {
    if (state.outcomeSelection === 'chipOnGreen') {
      remainingDistanceMeters = 0;
      nextActionType = 'putting';
    } else {
      remainingDistanceMeters = 10;
      nextActionType = 'chipping';
    }
  } else if (outcomeMode === 'gir') {
    if (state.outcomeSelection === 'girHoled') {
      remainingDistanceMeters = 0;
      nextActionType = null;
    } else if (state.outcomeSelection === 'girHit') {
      remainingDistanceMeters = 0;
      nextActionType = 'putting';
    } else {
      remainingDistanceMeters = 10;
      nextActionType = 'chipping';
    }
  }

  return {
    remainingDistanceMeters,
    nextActionType,
    nextSurface: nextActionType === 'putting' ? 'fairway' : getSurfaceFromOutcome(state.outcomeSelection as VirtualCaddyOutcomeSelection | null),
  };
}

export function buildEditSnapshot(trail: PlannerShot[], index: number) {
  const shot = trail[index];
  const showAdvanced =
    (shot.actionType !== 'putting' && shot.surface !== 'fairway') ||
    shot.lieQuality !== 'good' ||
    shot.slope !== 'flat' ||
    (shot.surface === 'bunker' && shot.bunkerLie !== 'clean') ||
    shot.temperature !== 'normal' ||
    shot.windDirection !== 'none' ||
    shot.windStrength !== 'calm' ||
    shot.hazards.length > 0;

  return { shot, showAdvanced };
}
