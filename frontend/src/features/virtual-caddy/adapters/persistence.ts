import type { HoleStats } from '../../../types';
import type { WedgeMatrixSource } from '../../../lib/wedgeMatrix';
import { getVirtualCaddyRecommendation } from '../../../lib/virtualCaddy';
import { applyVirtualCaddyTrailToHole } from '../../../lib/virtualCaddyExecution';
import { sanitizeHolePrepPlan } from '../../../lib/holePrep';
import { sanitizePersistedState, stripVirtualCaddyState } from '../domain/planner';
import type {
  PersistedPlannerDraft,
  PlannerShot,
  VirtualCaddyPanelProps,
  VirtualCaddyState,
} from '../types';

export { sanitizePersistedState, stripVirtualCaddyState };

const readNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildPersistedDraftFromState = (state: VirtualCaddyState, overrides: Partial<PersistedPlannerDraft> = {}): PersistedPlannerDraft => ({
  nextShotId: state.nextShotId,
  flowStep: state.flowStep,
  actionType: state.actionType,
  seededDistanceMeters: state.seededDistanceMeters,
  distanceToHoleMeters: state.distanceToHoleMeters,
  distanceToMiddleMeters: state.distanceToMiddleMeters,
  distanceMode: state.distanceMode,
  surface: state.surface,
  lieQuality: state.lieQuality,
  slope: state.slope,
  bunkerLie: state.bunkerLie,
  temperature: state.temperature,
  windDirection: state.windDirection,
  windStrength: state.windStrength,
  hazards: state.hazards,
  selectedClub: state.selectedClub,
  showClubOverride: state.showClubOverride,
  resultModeOverride: state.resultModeOverride,
  oopResult: state.oopResult,
  outcomeSelection: state.outcomeSelection,
  firstPuttDistanceMeters: state.firstPuttDistanceMeters,
  previousShotDistanceAdjustmentMeters: state.previousShotDistanceAdjustmentMeters,
  puttCount: state.puttCount,
  penaltyStrokes: state.penaltyStrokes,
  puttMissLong: state.puttMissLong,
  puttMissShort: state.puttMissShort,
  puttMissWithin2m: state.puttMissWithin2m,
  showRecommendationWhy: state.showRecommendationWhy,
  showPuttingDetails: state.showPuttingDetails,
  showAdvanced: state.showAdvanced,
  ...overrides,
});

export const buildShotDraftFromShot = (
  shot: PlannerShot,
  showAdvancedValue: boolean,
  carryByClub?: Record<string, number>,
  wedgeMatrixSources: WedgeMatrixSource[] = [],
): PersistedPlannerDraft => ({
  nextShotId: shot.id,
  flowStep: 'setup',
  actionType: shot.actionType,
  seededDistanceMeters: shot.distanceStartMeters,
  distanceToHoleMeters: shot.distanceStartMeters,
  distanceToMiddleMeters: shot.plannedDistanceMeters,
  distanceMode: shot.distanceMode,
  surface: shot.surface,
  lieQuality: shot.lieQuality,
  slope: shot.slope,
  bunkerLie: shot.bunkerLie,
  temperature: shot.temperature,
  windDirection: shot.windDirection,
  windStrength: shot.windStrength,
  hazards: shot.hazards,
  selectedClub: shot.club,
  showClubOverride:
    shot.club !==
    getVirtualCaddyRecommendation({
      distanceToMiddleMeters: shot.plannedDistanceMeters,
      surface: shot.surface,
      lieQuality: shot.lieQuality,
      slope: shot.slope,
      bunkerLie: shot.bunkerLie,
      temperature: shot.temperature,
      windDirection: shot.windDirection,
      windStrength: shot.windStrength,
      hazards: shot.hazards,
      carryByClub,
      wedgeMatrices: wedgeMatrixSources,
    }).recommendedClub,
  resultModeOverride: shot.outcomeSelection?.startsWith('gir') ? 'gir' : null,
  oopResult: shot.oopResult,
  outcomeSelection: shot.outcomeSelection,
  puttCount: shot.puttCount ?? null,
  penaltyStrokes: shot.penaltyStrokes ?? 0,
  firstPuttDistanceMeters: shot.firstPuttDistanceMeters ?? null,
  previousShotDistanceAdjustmentMeters: shot.previousShotDistanceAdjustmentMeters ?? 0,
  puttMissLong: shot.puttMissLong ?? 0,
  puttMissShort: shot.puttMissShort ?? 0,
  puttMissWithin2m: shot.puttMissWithin2m ?? 0,
  showRecommendationWhy: false,
  showPuttingDetails: (shot.puttMissLong ?? 0) > 0 || (shot.puttMissShort ?? 0) > 0 || (shot.puttMissWithin2m ?? 0) > 0,
  showAdvanced: showAdvancedValue,
});

export const buildNextHoleStats = (
  holeStats: HoleStats,
  nextBaseHoleStats: HoleStats,
  nextTrail: PlannerShot[],
  nextDraft: PersistedPlannerDraft,
  options: { clearManualTrackScore?: boolean } = {},
): HoleStats => {
  const prepPlan = sanitizeHolePrepPlan(holeStats.prepPlan ?? nextBaseHoleStats.prepPlan);

  return {
    ...applyVirtualCaddyTrailToHole(nextBaseHoleStats, nextTrail),
    prepPlan,
    manualScoreEnteredOnTrack: options.clearManualTrackScore ? false : Boolean(holeStats.manualScoreEnteredOnTrack),
    virtualCaddyState: {
      version: 1,
      baseHoleStats: {
        ...stripVirtualCaddyState(nextBaseHoleStats),
        prepPlan,
      },
      trail: nextTrail,
      draft: nextDraft,
      clubActualEntryIds: nextTrail
        .map((shot) => shot.clubActualEntryId)
        .filter((entryId): entryId is number => typeof entryId === 'number' && entryId > 0),
    },
  };
};

export const buildHydratedState = (
  holeStats: HoleStats,
  defaultDistanceMeters: number | null,
  createInitialState: (baseHoleStats: HoleStats, distanceMeters: number, surface: 'tee' | 'fairway') => VirtualCaddyState,
): VirtualCaddyState => {
  const persistedState = sanitizePersistedState(holeStats.virtualCaddyState);
  if (!persistedState) {
    return createInitialState(stripVirtualCaddyState(holeStats), defaultDistanceMeters ?? 150, 'tee');
  }

  const persistedDraft = persistedState.draft as PersistedPlannerDraft;
  const persistedTrail = Array.isArray(persistedState.trail) ? (persistedState.trail as PlannerShot[]) : [];
  const persistedBaseHoleStats =
    persistedState.baseHoleStats && typeof persistedState.baseHoleStats === 'object'
      ? (persistedState.baseHoleStats as HoleStats)
      : stripVirtualCaddyState(holeStats);
  const fallbackDistanceMeters = readNumber(persistedDraft.seededDistanceMeters) ?? defaultDistanceMeters ?? 150;
  const hydratedDistanceToHoleMeters = readNumber(persistedDraft.distanceToHoleMeters) ?? fallbackDistanceMeters;
  const hydratedDistanceToMiddleMeters = readNumber(persistedDraft.distanceToMiddleMeters) ?? fallbackDistanceMeters;

  const baseState = createInitialState(
    {
      ...stripVirtualCaddyState(persistedBaseHoleStats),
      prepPlan: sanitizeHolePrepPlan(holeStats.prepPlan ?? persistedBaseHoleStats.prepPlan),
    },
    fallbackDistanceMeters,
    'tee',
  );
  return {
    ...baseState,
    trail: persistedTrail,
    nextShotId: readNumber(persistedDraft.nextShotId) ?? persistedTrail.length + 1,
    flowStep:
      ((persistedDraft.actionType as string) || 'tee') === 'putting' && persistedDraft.flowStep === 'setup'
        ? 'action'
        : persistedTrail.length > 0 && persistedDraft.flowStep === 'overview'
          ? 'setup'
          : ((persistedDraft.flowStep as VirtualCaddyState['flowStep']) || 'overview'),
    actionType: (persistedDraft.actionType as VirtualCaddyState['actionType']) || 'tee',
    seededDistanceMeters: fallbackDistanceMeters,
    distanceToHoleMeters: hydratedDistanceToHoleMeters,
    distanceToMiddleMeters: hydratedDistanceToMiddleMeters,
    distanceMode: persistedDraft.distanceMode === 'point' ? 'point' : 'hole',
    surface: (persistedDraft.surface as VirtualCaddyState['surface']) || 'tee',
    lieQuality: (persistedDraft.lieQuality as VirtualCaddyState['lieQuality']) || 'good',
    slope: (persistedDraft.slope as VirtualCaddyState['slope']) || 'flat',
    bunkerLie: (persistedDraft.bunkerLie as VirtualCaddyState['bunkerLie']) || 'clean',
    temperature: (persistedDraft.temperature as VirtualCaddyState['temperature']) || 'normal',
    windDirection: (persistedDraft.windDirection as VirtualCaddyState['windDirection']) || 'none',
    windStrength: (persistedDraft.windStrength as VirtualCaddyState['windStrength']) || 'calm',
    hazards: Array.isArray(persistedDraft.hazards) ? persistedDraft.hazards : [],
    selectedClub: typeof persistedDraft.selectedClub === 'string' ? persistedDraft.selectedClub : null,
    showClubOverride: Boolean(persistedDraft.showClubOverride),
    resultModeOverride:
      persistedDraft.resultModeOverride === 'gir' || persistedDraft.resultModeOverride === 'fairway'
        ? persistedDraft.resultModeOverride
        : null,
    oopResult: (persistedDraft.oopResult as VirtualCaddyState['oopResult']) || 'none',
    outcomeSelection: (persistedDraft.outcomeSelection as VirtualCaddyState['outcomeSelection']) ?? null,
    firstPuttDistanceMeters: typeof persistedDraft.firstPuttDistanceMeters === 'number' ? persistedDraft.firstPuttDistanceMeters : null,
    previousShotDistanceAdjustmentMeters: Math.round(readNumber(persistedDraft.previousShotDistanceAdjustmentMeters) ?? 0),
    puttCount: typeof persistedDraft.puttCount === 'number' ? persistedDraft.puttCount : null,
    penaltyStrokes: Math.max(0, Math.floor(readNumber(persistedDraft.penaltyStrokes) ?? 0)),
    puttMissLong: readNumber(persistedDraft.puttMissLong) ?? 0,
    puttMissShort: readNumber(persistedDraft.puttMissShort) ?? 0,
    puttMissWithin2m: readNumber(persistedDraft.puttMissWithin2m) ?? 0,
    showRecommendationWhy: Boolean(persistedDraft.showRecommendationWhy),
    showPuttingDetails:
      typeof persistedDraft.showPuttingDetails === 'boolean'
        ? persistedDraft.showPuttingDetails
        : (readNumber(persistedDraft.puttMissLong) ?? 0) > 0 ||
          (readNumber(persistedDraft.puttMissShort) ?? 0) > 0 ||
          (readNumber(persistedDraft.puttMissWithin2m) ?? 0) > 0,
    showAdvanced: Boolean(persistedDraft.showAdvanced),
    showAllOverrideClubs: false,
    showPenaltyPicker: Math.max(0, Math.floor(readNumber(persistedDraft.penaltyStrokes) ?? 0)) > 0,
    awaitingHoleAdvance: false,
    editingIndex: null,
    editingSnapshot: null,
    editingOriginalShot: null,
    editingBaselineDraft: null,
  };
};

export const getFeatureProps = (props: VirtualCaddyPanelProps) => props;
