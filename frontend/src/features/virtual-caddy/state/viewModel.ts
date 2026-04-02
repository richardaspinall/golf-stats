import type { VirtualCaddyState } from '../types';

export function getOverviewViewModel(state: VirtualCaddyState, defaultDistanceMeters: number | null) {
  const isFirstShot = state.trail.length === 0;
  return {
    isFirstShot,
    overviewTitle: isFirstShot ? 'Hole details' : 'Distance left',
    overviewDistanceSummary: isFirstShot ? (defaultDistanceMeters != null ? `Length ${defaultDistanceMeters}m` : null) : `Distance left ${state.distanceToHoleMeters}m`,
  };
}

export function getShotBannerViewModel(state: VirtualCaddyState) {
  const isPutting = state.actionType === 'putting';
  const shotDistanceBannerLabel = isPutting
    ? state.distanceToHoleMeters === 0
      ? 'On the green'
      : 'Distance left'
    : state.distanceMode === 'point'
      ? 'Distance to target'
      : 'Distance to green';

  const shotDistanceBannerValue = isPutting
    ? state.distanceToHoleMeters === 0
      ? null
      : `${state.distanceToHoleMeters}m`
    : state.distanceMode === 'point'
      ? `${state.distanceToMiddleMeters}m`
      : `${state.distanceToHoleMeters}m`;

  const canResetShotDistanceBanner =
    state.distanceMode === 'point' ? state.distanceToMiddleMeters !== state.distanceToHoleMeters : state.distanceToHoleMeters !== state.seededDistanceMeters;

  const distanceSliderMax = Math.max(300, state.seededDistanceMeters, state.distanceToHoleMeters, state.distanceToMiddleMeters);

  return {
    shotDistanceBannerLabel,
    shotDistanceBannerValue,
    canResetShotDistanceBanner,
    distanceSliderMax,
  };
}

export function getCompletionViewModel(state: VirtualCaddyState, finalShot: VirtualCaddyState['editingOriginalShot'] | null) {
  const isDirectHoledFinish = finalShot?.outcomeSelection === 'girHoled';
  const isHoleInOneFinish = Boolean(isDirectHoledFinish && state.trail.length === 1 && finalShot?.actionType === 'tee');
  const showHoledCelebration = Boolean(isDirectHoledFinish && !isHoleInOneFinish);
  const completionTitle = isHoleInOneFinish ? 'Hole in one' : isDirectHoledFinish ? 'Holed out' : 'Hole summary';
  const completionDetail = isHoleInOneFinish
    ? `${finalShot?.club ?? 'Shot'} never left the cup.`
    : isDirectHoledFinish && finalShot
      ? `Holed from ${finalShot.distanceStartMeters}m with ${finalShot.club}.`
      : null;

  return {
    isHoleInOneFinish,
    showHoledCelebration,
    completionTitle,
    completionDetail,
  };
}
