import type { HoleStats } from '../../../types';
import type { VirtualCaddyBunkerLie, VirtualCaddyHazardSide, VirtualCaddyInputs } from '../../../lib/virtualCaddy';
import type { VirtualCaddyOutcomeSelection } from '../../../lib/virtualCaddyExecution';
import type {
  PersistedPlannerDraft,
  PlannerActionType,
  PlannerShot,
  PlannerSnapshot,
  VirtualCaddyFlowStep,
  VirtualCaddyState,
} from '../types';

const createDefaultDraft = (distanceMeters: number, surface: NonNullable<VirtualCaddyInputs['surface']>): PersistedPlannerDraft => ({
  nextShotId: 1,
  flowStep: 'overview',
  actionType: 'tee',
  seededDistanceMeters: distanceMeters,
  distanceToHoleMeters: distanceMeters,
  distanceToMiddleMeters: distanceMeters,
  distanceMode: 'hole',
  surface,
  lieQuality: 'good',
  slope: 'flat',
  bunkerLie: 'clean',
  temperature: 'normal',
  windDirection: 'none',
  windStrength: 'calm',
  hazards: [],
  selectedClub: null,
  showClubOverride: false,
  resultModeOverride: null,
  oopResult: 'none',
  outcomeSelection: null,
  firstPuttDistanceMeters: null,
  puttCount: null,
  penaltyStrokes: 0,
  puttMissLong: 0,
  puttMissShort: 0,
  puttMissWithin2m: 0,
  showRecommendationWhy: false,
  showPuttingDetails: false,
  showAdvanced: false,
});

export const createInitialVirtualCaddyState = (holeStats: HoleStats, distanceMeters: number, surface: NonNullable<VirtualCaddyInputs['surface']>): VirtualCaddyState => ({
  baseHoleStats: holeStats,
  trail: [],
  ...createDefaultDraft(distanceMeters, surface),
  showAllOverrideClubs: false,
  showPenaltyPicker: false,
  awaitingHoleAdvance: false,
  editingIndex: null,
  editingSnapshot: null,
  editingOriginalShot: null,
  editingBaselineDraft: null,
});

export type VirtualCaddyAction =
  | { type: 'hydrate'; payload: VirtualCaddyState }
  | { type: 'patch'; payload: Partial<VirtualCaddyState> }
  | { type: 'patchDraft'; payload: Partial<PersistedPlannerDraft> }
  | { type: 'setFlowStep'; payload: VirtualCaddyFlowStep }
  | { type: 'setActionType'; payload: PlannerActionType }
  | { type: 'toggleHazard'; payload: VirtualCaddyHazardSide }
  | { type: 'setSurface'; payload: NonNullable<VirtualCaddyInputs['surface']> }
  | { type: 'setBunkerLie'; payload: VirtualCaddyBunkerLie }
  | { type: 'setOutcomeSelection'; payload: VirtualCaddyOutcomeSelection | null }
  | { type: 'setDistanceMode'; payload: 'hole' | 'point' }
  | { type: 'setHoleDistance'; payload: number }
  | { type: 'setShotDistance'; payload: number }
  | { type: 'setPuttCount'; payload: number | null }
  | { type: 'setPenaltyStrokes'; payload: number }
  | { type: 'setPuttDetail'; payload: { key: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m'; value: number } }
  | { type: 'resetDraft'; payload: { distanceMeters: number; surface: NonNullable<VirtualCaddyInputs['surface']>; flowStep?: VirtualCaddyFlowStep; actionType?: PlannerActionType; nextShotId?: number } }
  | { type: 'startEdit'; payload: { index: number; snapshot: PlannerSnapshot; shot: PlannerShot; showAdvanced: boolean } }
  | { type: 'cancelEdit'; payload: PlannerSnapshot }
  | {
      type: 'applySavedShot';
      payload: {
        nextTrail: PlannerShot[];
        nextShotId: number;
        nextActionType: PlannerActionType | null;
        remainingDistanceMeters: number;
        nextSurface: NonNullable<VirtualCaddyInputs['surface']>;
        awaitingHoleAdvance: boolean;
      };
    };

const clampDistanceMeters = (distanceMeters: number) => Math.min(600, Math.max(0, distanceMeters));

export function virtualCaddyReducer(state: VirtualCaddyState, action: VirtualCaddyAction): VirtualCaddyState {
  switch (action.type) {
    case 'hydrate':
      return action.payload;
    case 'patch':
      return { ...state, ...action.payload };
    case 'patchDraft':
      return { ...state, ...action.payload };
    case 'setFlowStep':
      return { ...state, flowStep: action.payload };
    case 'setActionType':
      return { ...state, actionType: action.payload };
    case 'toggleHazard':
      return {
        ...state,
        hazards: state.hazards.includes(action.payload)
          ? state.hazards.filter((item) => item !== action.payload)
          : [...state.hazards, action.payload],
      };
    case 'setSurface':
      return { ...state, surface: action.payload };
    case 'setBunkerLie':
      return { ...state, bunkerLie: action.payload };
    case 'setOutcomeSelection':
      return { ...state, outcomeSelection: action.payload };
    case 'setDistanceMode':
      if (action.payload === 'hole') {
        return { ...state, distanceMode: 'hole', distanceToMiddleMeters: state.distanceToHoleMeters };
      }
      return {
        ...state,
        distanceMode: 'point',
        distanceToHoleMeters: Math.max(state.distanceToHoleMeters, state.seededDistanceMeters),
        distanceToMiddleMeters: Math.min(state.distanceToHoleMeters, Math.max(state.distanceToHoleMeters, state.seededDistanceMeters)),
      };
    case 'setHoleDistance': {
      const clamped = clampDistanceMeters(action.payload);
      return {
        ...state,
        distanceToHoleMeters: clamped,
        distanceToMiddleMeters: state.distanceMode === 'hole' ? clamped : Math.min(state.distanceToMiddleMeters, clamped),
      };
    }
    case 'setShotDistance':
      return {
        ...state,
        distanceToMiddleMeters: Math.min(clampDistanceMeters(action.payload), state.distanceToHoleMeters),
      };
    case 'setPuttCount':
      return {
        ...state,
        puttCount: action.payload,
        outcomeSelection: action.payload != null ? 'puttHoled' : state.outcomeSelection,
      };
    case 'setPenaltyStrokes':
      return { ...state, penaltyStrokes: Math.max(0, Math.floor(action.payload)), showPenaltyPicker: Math.max(0, Math.floor(action.payload)) > 0 };
    case 'setPuttDetail':
      return { ...state, [action.payload.key]: Math.max(0, Math.floor(action.payload.value)) };
    case 'resetDraft': {
      const nextDraft = createDefaultDraft(action.payload.distanceMeters, action.payload.surface);
      return {
        ...state,
        ...nextDraft,
        flowStep: action.payload.flowStep ?? nextDraft.flowStep,
        actionType: action.payload.actionType ?? nextDraft.actionType,
        nextShotId: action.payload.nextShotId ?? state.nextShotId,
        showAllOverrideClubs: false,
        showPenaltyPicker: false,
        awaitingHoleAdvance: false,
      };
    }
    case 'startEdit':
      return {
        ...state,
        editingIndex: action.payload.index,
        editingOriginalShot: action.payload.shot,
        editingSnapshot: action.payload.snapshot,
        editingBaselineDraft: null,
        trail: state.trail.slice(0, action.payload.index),
        flowStep: action.payload.shot.actionType === 'putting' ? 'action' : 'setup',
        actionType: action.payload.shot.actionType,
        distanceToHoleMeters: action.payload.shot.distanceStartMeters,
        distanceToMiddleMeters: action.payload.shot.plannedDistanceMeters,
        seededDistanceMeters: action.payload.shot.distanceStartMeters,
        distanceMode: action.payload.shot.distanceMode,
        surface: action.payload.shot.surface,
        lieQuality: action.payload.shot.lieQuality,
        slope: action.payload.shot.slope,
        bunkerLie: action.payload.shot.bunkerLie,
        temperature: action.payload.shot.temperature,
        windDirection: action.payload.shot.windDirection,
        windStrength: action.payload.shot.windStrength,
        hazards: action.payload.shot.hazards,
        selectedClub: action.payload.shot.actionType === 'putting' ? null : action.payload.shot.club,
        showClubOverride: false,
        showAllOverrideClubs: false,
        resultModeOverride: action.payload.shot.outcomeSelection?.startsWith('gir') ? 'gir' : null,
        oopResult: action.payload.shot.oopResult,
        outcomeSelection: action.payload.shot.outcomeSelection,
        firstPuttDistanceMeters: action.payload.shot.firstPuttDistanceMeters ?? null,
        puttCount: action.payload.shot.puttCount ?? null,
        penaltyStrokes: action.payload.shot.penaltyStrokes ?? 0,
        puttMissLong: action.payload.shot.puttMissLong ?? 0,
        puttMissShort: action.payload.shot.puttMissShort ?? 0,
        puttMissWithin2m: action.payload.shot.puttMissWithin2m ?? 0,
        showRecommendationWhy: false,
        showPuttingDetails:
          (action.payload.shot.puttMissLong ?? 0) > 0 ||
          (action.payload.shot.puttMissShort ?? 0) > 0 ||
          (action.payload.shot.puttMissWithin2m ?? 0) > 0,
        showPenaltyPicker: (action.payload.shot.penaltyStrokes ?? 0) > 0,
        showAdvanced: action.payload.showAdvanced,
        nextShotId: action.payload.shot.id,
      };
    case 'cancelEdit':
      return {
        ...state,
        baseHoleStats: action.payload.baseHoleStats,
        trail: action.payload.trail,
        ...action.payload.draft,
        showAllOverrideClubs: false,
        showPenaltyPicker: (action.payload.draft.penaltyStrokes ?? 0) > 0,
        awaitingHoleAdvance: false,
        editingIndex: null,
        editingSnapshot: null,
        editingOriginalShot: null,
        editingBaselineDraft: null,
      };
    case 'applySavedShot':
      return {
        ...state,
        trail: action.payload.nextTrail,
        nextShotId: action.payload.nextShotId,
        flowStep: action.payload.nextActionType === 'putting' ? 'action' : action.payload.nextActionType ? 'setup' : 'action',
        actionType: action.payload.nextActionType ?? state.actionType,
        ...(
          action.payload.nextActionType
            ? {
                ...createDefaultDraft(action.payload.remainingDistanceMeters, action.payload.nextSurface),
                flowStep: action.payload.nextActionType === 'putting' ? 'action' : 'setup',
                actionType: action.payload.nextActionType,
                nextShotId: action.payload.nextShotId,
              }
            : {}
        ),
        awaitingHoleAdvance: action.payload.awaitingHoleAdvance,
        editingIndex: null,
        editingSnapshot: null,
        editingOriginalShot: null,
        editingBaselineDraft: null,
        showPenaltyPicker: false,
      };
    default:
      return state;
  }
}
