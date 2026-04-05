import type { HoleStats, PersistedVirtualCaddyState, WedgeEntry, WedgeMatrix } from '../../types';
import type {
  VirtualCaddyBunkerLie,
  VirtualCaddyHazardSide,
  VirtualCaddyInputs,
} from '../../lib/virtualCaddy';
import type { VirtualCaddyExecutedShot, VirtualCaddyOutcomeSelection } from '../../lib/virtualCaddyExecution';

export type VirtualCaddyPanelProps = {
  roundId?: string | null;
  hole: number;
  holeStats: HoleStats;
  displayHoleIndex?: number | null;
  displayHolePar: number | null;
  defaultDistanceMeters: number | null;
  carryByClub?: Record<string, number>;
  wedgeMatrices?: WedgeMatrix[];
  wedgeEntriesByMatrix?: Record<number, WedgeEntry[]>;
  isFocusMode?: boolean;
  onReplaceHoleStats: (nextHoleStats: HoleStats) => void;
  onSaveHoleStats?: (nextHoleStats: HoleStats, options?: { persistToServer?: boolean }) => Promise<boolean>;
  onSaveClubActual?: (shot: { club: string; actualMeters: number }) => Promise<number | null>;
  onSyncClubActuals?: (payload: {
    roundId: string;
    hole: number;
    shots: Array<{ shotId: number; club: string; actualMeters: number }>;
  }) => Promise<Array<{ shotId: number; entryId: number }>>;
  onDeleteClubActualEntry?: (entryId: number) => Promise<void>;
  onOpenWedgeMatrix?: (matrixId: number | null) => void;
  onToggleFocusMode?: () => void;
  onHoleComplete?: (
    nextHoleStats: HoleStats,
    options?: { persistToServer?: boolean; advanceHole?: boolean },
  ) => Promise<boolean> | boolean;
};

export type PlannerActionType = 'tee' | 'shot' | 'chipping' | 'putting';
export type VirtualCaddyFlowStep = 'overview' | 'setup' | 'action';

export type PlannerShot = VirtualCaddyExecutedShot & {
  id: number;
  label: string;
  actionType: PlannerActionType;
  firstPuttDistanceMeters?: number | null;
  previousShotDistanceAdjustmentMeters?: number | null;
  previousShotUseFlagAdjustment?: boolean | null;
  distanceStartMeters: number;
  plannedDistanceMeters: number;
  remainingDistanceMeters: number;
  distanceMode: 'hole' | 'point';
  surface: NonNullable<VirtualCaddyInputs['surface']>;
  lieQuality: NonNullable<VirtualCaddyInputs['lieQuality']>;
  slope: NonNullable<VirtualCaddyInputs['slope']>;
  bunkerLie: VirtualCaddyBunkerLie;
  temperature: NonNullable<VirtualCaddyInputs['temperature']>;
  windDirection: NonNullable<VirtualCaddyInputs['windDirection']>;
  windStrength: NonNullable<VirtualCaddyInputs['windStrength']>;
  hazards: VirtualCaddyHazardSide[];
  club: string;
  carryMeters: number;
  puttCount?: number | null;
  penaltyStrokes?: number;
  puttMissLong?: number;
  puttMissShort?: number;
  puttMissWithin2m?: number;
  clubActualEntryId?: number | null;
};

export type PersistedPlannerDraft = {
  nextShotId: number;
  flowStep: VirtualCaddyFlowStep;
  actionType: PlannerActionType;
  seededDistanceMeters: number;
  distanceToHoleMeters: number;
  distanceToMiddleMeters: number;
  distanceMode: 'hole' | 'point';
  surface: NonNullable<VirtualCaddyInputs['surface']>;
  lieQuality: NonNullable<VirtualCaddyInputs['lieQuality']>;
  slope: NonNullable<VirtualCaddyInputs['slope']>;
  bunkerLie: VirtualCaddyBunkerLie;
  temperature: NonNullable<VirtualCaddyInputs['temperature']>;
  windDirection: NonNullable<VirtualCaddyInputs['windDirection']>;
  windStrength: NonNullable<VirtualCaddyInputs['windStrength']>;
  hazards: VirtualCaddyHazardSide[];
  selectedClub: string | null;
  showClubOverride: boolean;
  resultModeOverride: 'fairway' | 'gir' | null;
  oopResult: 'none' | 'look' | 'noLook';
  outcomeSelection: VirtualCaddyOutcomeSelection | null;
  firstPuttDistanceMeters: number | null;
  previousShotDistanceAdjustmentMeters: number;
  previousShotUseFlagAdjustment: boolean;
  puttCount: number | null;
  penaltyStrokes: number;
  puttMissLong: number;
  puttMissShort: number;
  puttMissWithin2m: number;
  showRecommendationWhy: boolean;
  showPuttingDetails: boolean;
  showAdvanced: boolean;
};

export type PlannerSnapshot = {
  baseHoleStats: HoleStats;
  trail: PlannerShot[];
  draft: PersistedPlannerDraft;
  persistedClubActualEntryIds: number[];
};

export type VirtualCaddyState = PersistedPlannerDraft & {
  baseHoleStats: HoleStats;
  trail: PlannerShot[];
  showAllOverrideClubs: boolean;
  showPenaltyPicker: boolean;
  awaitingHoleAdvance: boolean;
  editingIndex: number | null;
  editingSnapshot: PlannerSnapshot | null;
  editingOriginalShot: PlannerShot | null;
  editingBaselineDraft: PersistedPlannerDraft | null;
};

export type ScoreSummaryTone = 'neutral' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double';

export type PersistedVirtualCaddyPlannerState = PersistedVirtualCaddyState | null;
