import { useEffect, useMemo, useRef, useState } from 'react';

import type { HoleStats, PersistedVirtualCaddyState, WedgeEntry, WedgeMatrix } from '../types';
import type { WedgeMatrixSource } from '../lib/wedgeMatrix';
import {
  type VirtualCaddyBunkerLie,
  type VirtualCaddyHazardSide,
  type VirtualCaddyInputs,
  getCarryBook,
  getLongestClubCarry,
  getVirtualCaddyRecommendation,
} from '../lib/virtualCaddy';
import {
  type VirtualCaddyExecutedShot,
  type VirtualCaddyOutcomeSelection,
  applyVirtualCaddyTrailToHole,
} from '../lib/virtualCaddyExecution';

const CHIPPING_MAX_DISTANCE_METERS = 40;

const SURFACE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['surface']>; label: string }> = [
  { key: 'tee', label: 'Tee' },
  { key: 'fairway', label: 'Fairway' },
  { key: 'rough', label: 'Rough' },
  { key: 'firstCut', label: 'First cut' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'bunker', label: 'Bunker' },
];

const LIE_QUALITY_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['lieQuality']>; label: string }> = [
  { key: 'good', label: 'Good lie' },
  { key: 'normal', label: 'Normal lie' },
  { key: 'poor', label: 'Poor lie' },
];

const SLOPE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['slope']>; label: string }> = [
  { key: 'flat', label: 'Flat' },
  { key: 'uphill', label: 'Uphill' },
  { key: 'downhill', label: 'Downhill' },
  { key: 'ballAboveFeet', label: 'Ball above feet' },
  { key: 'ballBelowFeet', label: 'Ball below feet' },
];

const BUNKER_LIE_OPTIONS: Array<{ key: VirtualCaddyBunkerLie; label: string }> = [
  { key: 'clean', label: 'Clean' },
  { key: 'softSand', label: 'Soft sand' },
  { key: 'firmSand', label: 'Firm sand' },
  { key: 'buried', label: 'Buried' },
  { key: 'lip', label: 'Lip in play' },
];

const WIND_DIRECTION_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windDirection']>; label: string }> = [
  { key: 'none', label: 'No wind' },
  { key: 'into', label: 'Into wind' },
  { key: 'helping', label: 'Helping wind' },
  { key: 'leftToRight', label: 'L to R' },
  { key: 'rightToLeft', label: 'R to L' },
];

const WIND_STRENGTH_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windStrength']>; label: string }> = [
  { key: 'calm', label: 'Calm' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'strong', label: 'Strong' },
];

const HAZARD_OPTIONS: Array<{ key: VirtualCaddyHazardSide; label: string }> = [
  { key: 'left', label: 'Trouble left' },
  { key: 'right', label: 'Trouble right' },
  { key: 'short', label: 'Short-sided' },
  { key: 'long', label: 'Long is bad' },
];

const FAIRWAY_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'fairwayHit', label: 'Fairway hit' },
  { key: 'fairwayLeft', label: 'Left' },
  { key: 'fairwayRight', label: 'Right' },
  { key: 'fairwayShort', label: 'Short' },
  { key: 'fairwayLong', label: 'Long' },
];

const GIR_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'girHit', label: 'Green hit' },
  { key: 'girHoled', label: 'Holed' },
  { key: 'girLeft', label: 'Left' },
  { key: 'girRight', label: 'Right' },
  { key: 'girShort', label: 'Short' },
  { key: 'girLong', label: 'Long' },
];

const CHIP_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'chipOnGreen', label: 'On green' },
  { key: 'chipMissGreen', label: 'Miss green' },
];

const PUTT_COUNT_OPTIONS = [1, 2, 3] as const;
const PENALTY_STROKE_OPTIONS = [0, 1, 2] as const;
const PUTTING_DETAIL_OPTIONS = [
  { key: 'puttMissLong', label: 'Miss long' },
  { key: 'puttMissShort', label: 'Miss short' },
  { key: 'puttMissWithin2m', label: 'Miss within 2m' },
] as const;

type VirtualCaddyPanelProps = {
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
  onSaveHoleStats?: (nextHoleStats: HoleStats) => Promise<boolean>;
  onSaveClubActual?: (shot: { club: string; actualMeters: number }) => Promise<number | null>;
  onDeleteClubActualEntry?: (entryId: number) => Promise<void>;
  onHoleComplete?: () => void;
};

type PlannerActionType = 'tee' | 'shot' | 'chipping' | 'putting';
type VirtualCaddyFlowStep = 'overview' | 'setup' | 'action';

type PlannerShot = VirtualCaddyExecutedShot & {
  id: number;
  label: string;
  actionType: PlannerActionType;
  firstPuttDistanceMeters?: number | null;
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

type PersistedPlannerDraft = {
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
  puttCount: number | null;
  penaltyStrokes: number;
  puttMissLong: number;
  puttMissShort: number;
  puttMissWithin2m: number;
  showRecommendationWhy: boolean;
  showPuttingDetails: boolean;
  showAdvanced: boolean;
};

type PlannerSnapshot = {
  baseHoleStats: HoleStats;
  trail: PlannerShot[];
  draft: PersistedPlannerDraft;
};

const buildComparableDraft = (draft: PersistedPlannerDraft) => {
  const { flowStep: _flowStep, ...comparableDraft } = draft;
  return comparableDraft;
};

const stripVirtualCaddyState = (holeStats: HoleStats): HoleStats => ({
  ...holeStats,
  manualScoreEnteredOnTrack: Boolean(holeStats.manualScoreEnteredOnTrack),
  virtualCaddyState: null,
});

const sanitizePersistedState = (value: unknown): PersistedVirtualCaddyState | null =>
  value && typeof value === 'object' && (value as PersistedVirtualCaddyState).version === 1 ? (value as PersistedVirtualCaddyState) : null;

const buildShotDraftFromShot = (
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
  showClubOverride: shot.club !== getVirtualCaddyRecommendation({
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
  resultModeOverride:
    shot.outcomeSelection === 'girHit' ||
    shot.outcomeSelection === 'girHoled' ||
    shot.outcomeSelection === 'girLeft' ||
    shot.outcomeSelection === 'girRight' ||
    shot.outcomeSelection === 'girShort' ||
    shot.outcomeSelection === 'girLong'
      ? 'gir'
      : null,
  oopResult: shot.oopResult,
  outcomeSelection: shot.outcomeSelection,
  puttCount: shot.puttCount ?? null,
  penaltyStrokes: shot.penaltyStrokes ?? 0,
  firstPuttDistanceMeters: shot.firstPuttDistanceMeters ?? null,
  puttMissLong: shot.puttMissLong ?? 0,
  puttMissShort: shot.puttMissShort ?? 0,
  puttMissWithin2m: shot.puttMissWithin2m ?? 0,
  showRecommendationWhy: false,
  showPuttingDetails: (shot.puttMissLong ?? 0) > 0 || (shot.puttMissShort ?? 0) > 0 || (shot.puttMissWithin2m ?? 0) > 0,
  showAdvanced: showAdvancedValue,
});

const shouldTrackClubActual = (shot: Pick<PlannerShot, 'actionType' | 'surface' | 'club'>) =>
  shot.actionType !== 'putting' &&
  shot.actionType !== 'chipping' &&
  shot.surface !== 'bunker' &&
  shot.club !== 'Putter' &&
  shot.club !== 'Chip shot';

const getShotLabel = (shotNumber: number, actionType: PlannerActionType) => {
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

const getSurfaceFromOutcome = (outcomeSelection: VirtualCaddyOutcomeSelection | null): NonNullable<VirtualCaddyInputs['surface']> => {
  if (outcomeSelection === 'fairwayHit' || outcomeSelection === 'fairwayShort' || outcomeSelection === 'fairwayLong') {
    return 'fairway';
  }
  if (outcomeSelection === 'fairwayLeft' || outcomeSelection === 'fairwayRight' || outcomeSelection === 'girLeft' || outcomeSelection === 'girRight') {
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

const getOutcomeMode = (distanceMeters: number, displayHolePar: number | null, longestCarry: number) =>
  displayHolePar === 3 || distanceMeters <= longestCarry ? 'gir' : 'fairway';

const getOutcomeOptions = (mode: 'fairway' | 'gir') => (mode === 'fairway' ? FAIRWAY_OUTCOME_OPTIONS : GIR_OUTCOME_OPTIONS);
const getActualDistanceFromStart = (distanceStartMeters: number, remainingDistanceMeters: number) =>
  Math.max(0, distanceStartMeters - remainingDistanceMeters);
const WEDGE_CLUBS = new Set(['PW', '50w', '56w', '60w']);
const isOopSurface = (surface: NonNullable<VirtualCaddyInputs['surface']>) => surface !== 'tee' && surface !== 'fairway';
const isGreenHitOutcome = (outcomeSelection: VirtualCaddyOutcomeSelection | null) =>
  outcomeSelection === 'girHit' || outcomeSelection === 'girHoled' || outcomeSelection === 'chipOnGreen';
const clampDistanceMeters = (distanceMeters: number) => Math.min(600, Math.max(0, distanceMeters));

const formatOutcomeLabel = (outcomeSelection: VirtualCaddyOutcomeSelection | null) => {
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

const formatTrailResultLabel = (shot: PlannerShot) => {
  if (shot.actionType === 'putting' && typeof shot.puttCount === 'number' && shot.puttCount > 0) {
    return `${shot.puttCount} ${shot.puttCount === 1 ? 'putt' : 'putts'}`;
  }

  if (shot.actionType === 'tee' && shot.outcomeSelection === 'girHoled') {
    return 'Hole in one';
  }

  return formatOutcomeLabel(shot.outcomeSelection);
};

const getOutcomePositionClass = (outcomeKey: VirtualCaddyOutcomeSelection) => {
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

const formatTrailSummary = (shot: PlannerShot) => {
  const penaltySuffix = shot.penaltyStrokes ? ` + ${shot.penaltyStrokes} penalty stroke${shot.penaltyStrokes === 1 ? '' : 's'}` : '';

  if (shot.actionType === 'putting') {
    const firstPuttDistanceSuffix =
      typeof shot.firstPuttDistanceMeters === 'number' && shot.firstPuttDistanceMeters > 0 ? ` from ${shot.firstPuttDistanceMeters}m` : '';
    return `${shot.club}: ${formatTrailResultLabel(shot)}${firstPuttDistanceSuffix}${penaltySuffix}`;
  }

  return `Started at ${shot.distanceStartMeters}m with ${shot.carryMeters}m carry. ${formatTrailResultLabel(shot)}${penaltySuffix}.`;
};

const summarizeCompletedHole = (trail: PlannerShot[], displayHolePar: number | null) => {
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

const getScoreSummaryStyle = (par: number | null, score: number) => {
  if (par == null) {
    return {
      tone: 'neutral' as const,
    };
  }

  const diff = score - par;
  if (diff <= -2) {
    return { tone: 'eagle' as const };
  }
  if (diff === -1) {
    return { tone: 'birdie' as const };
  }
  if (diff === 0) {
    return { tone: 'par' as const };
  }
  if (diff === 1) {
    return { tone: 'bogey' as const };
  }
  return { tone: 'double' as const };
};

const deriveOopResult = (
  actionType: PlannerActionType,
  surface: NonNullable<VirtualCaddyInputs['surface']>,
  oopResult: 'none' | 'look' | 'noLook',
) => (actionType !== 'putting' && isOopSurface(surface) ? oopResult : 'none');

const deriveShotCategory = (
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

export function VirtualCaddyPanel({
  hole,
  holeStats,
  displayHoleIndex = null,
  displayHolePar,
  defaultDistanceMeters,
  carryByClub,
  wedgeMatrices = [],
  wedgeEntriesByMatrix = {},
  isFocusMode = false,
  onReplaceHoleStats,
  onSaveHoleStats,
  onSaveClubActual,
  onDeleteClubActualEntry,
  onHoleComplete,
}: VirtualCaddyPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [baseHoleStats, setBaseHoleStats] = useState(holeStats);
  const [trail, setTrail] = useState<PlannerShot[]>([]);
  const [nextShotId, setNextShotId] = useState(1);
  const [flowStep, setFlowStep] = useState<VirtualCaddyFlowStep>('overview');
  const [actionType, setActionType] = useState<PlannerActionType>('tee');
  const [seededDistanceMeters, setSeededDistanceMeters] = useState(defaultDistanceMeters ?? 150);

  const [distanceToHoleMeters, setDistanceToHoleMeters] = useState(defaultDistanceMeters ?? 150);
  const [distanceToMiddleMeters, setDistanceToMiddleMeters] = useState(defaultDistanceMeters ?? 150);
  const [distanceMode, setDistanceMode] = useState<'hole' | 'point'>('hole');
  const [surface, setSurface] = useState<NonNullable<VirtualCaddyInputs['surface']>>('tee');
  const [lieQuality, setLieQuality] = useState<NonNullable<VirtualCaddyInputs['lieQuality']>>('good');
  const [slope, setSlope] = useState<NonNullable<VirtualCaddyInputs['slope']>>('flat');
  const [bunkerLie, setBunkerLie] = useState<VirtualCaddyBunkerLie>('clean');
  const [temperature, setTemperature] = useState<NonNullable<VirtualCaddyInputs['temperature']>>('normal');
  const [windDirection, setWindDirection] = useState<NonNullable<VirtualCaddyInputs['windDirection']>>('none');
  const [windStrength, setWindStrength] = useState<NonNullable<VirtualCaddyInputs['windStrength']>>('calm');
  const [hazards, setHazards] = useState<VirtualCaddyHazardSide[]>([]);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [showClubOverride, setShowClubOverride] = useState(false);
  const [showAllOverrideClubs, setShowAllOverrideClubs] = useState(false);
  const [resultModeOverride, setResultModeOverride] = useState<'fairway' | 'gir' | null>(null);
  const [oopResult, setOopResult] = useState<'none' | 'look' | 'noLook'>('none');
  const [outcomeSelection, setOutcomeSelection] = useState<VirtualCaddyOutcomeSelection | null>(null);
  const [puttCount, setPuttCount] = useState<number | null>(null);
  const [penaltyStrokes, setPenaltyStrokes] = useState(0);
  const [firstPuttDistanceMeters, setFirstPuttDistanceMeters] = useState<number | null>(null);
  const [puttMissLong, setPuttMissLong] = useState(0);
  const [puttMissShort, setPuttMissShort] = useState(0);
  const [puttMissWithin2m, setPuttMissWithin2m] = useState(0);
  const [showRecommendationWhy, setShowRecommendationWhy] = useState(false);
  const [showPuttingDetails, setShowPuttingDetails] = useState(false);
  const [showPenaltyPicker, setShowPenaltyPicker] = useState(false);
  const [awaitingHoleAdvance, setAwaitingHoleAdvance] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<PlannerSnapshot | null>(null);
  const [editingOriginalShot, setEditingOriginalShot] = useState<PlannerShot | null>(null);
  const [editingBaselineDraft, setEditingBaselineDraft] = useState<PersistedPlannerDraft | null>(null);
  const lastSyncedHoleStatsRef = useRef<string | null>(null);
  const replaceHoleStatsRef = useRef(onReplaceHoleStats);
  const saveHoleStatsRef = useRef(onSaveHoleStats);

  useEffect(() => {
    replaceHoleStatsRef.current = onReplaceHoleStats;
  }, [onReplaceHoleStats]);

  useEffect(() => {
    saveHoleStatsRef.current = onSaveHoleStats;
  }, [onSaveHoleStats]);

  const resetDraft = (distanceMeters: number, surfaceValue: NonNullable<VirtualCaddyInputs['surface']>) => {
    setSeededDistanceMeters(distanceMeters);
    setDistanceToHoleMeters(distanceMeters);
    setDistanceToMiddleMeters(distanceMeters);
    setDistanceMode('hole');
    setSurface(surfaceValue);
    setLieQuality('good');
    setSlope('flat');
    setBunkerLie('clean');
    setTemperature('normal');
    setWindDirection('none');
    setWindStrength('calm');
    setHazards([]);
    setSelectedClub(null);
    setShowClubOverride(false);
    setShowAllOverrideClubs(false);
    setResultModeOverride(null);
    setOopResult('none');
    setOutcomeSelection(null);
    setPuttCount(null);
    setPenaltyStrokes(0);
    setFirstPuttDistanceMeters(null);
    setPuttMissLong(0);
    setPuttMissShort(0);
    setPuttMissWithin2m(0);
    setShowRecommendationWhy(false);
    setShowPuttingDetails(false);
    setShowPenaltyPicker(false);
    setAwaitingHoleAdvance(false);
    setShowAdvanced(false);
  };

  const buildPersistedDraft = (
    overrides: Partial<PersistedPlannerDraft> = {},
  ): PersistedPlannerDraft => ({
    nextShotId,
    flowStep,
    actionType,
    seededDistanceMeters,
    distanceToHoleMeters,
    distanceToMiddleMeters,
    distanceMode,
    surface,
    lieQuality,
    slope,
    bunkerLie,
    temperature,
    windDirection,
    windStrength,
    hazards,
    selectedClub,
    showClubOverride,
    resultModeOverride,
    oopResult,
    outcomeSelection,
    firstPuttDistanceMeters,
    puttCount,
    penaltyStrokes,
    puttMissLong,
    puttMissShort,
    puttMissWithin2m,
    showRecommendationWhy,
    showPuttingDetails,
    showAdvanced,
    ...overrides,
  });

  useEffect(() => {
    if (editingIndex == null || editingBaselineDraft) {
      return;
    }

    setEditingBaselineDraft(buildPersistedDraft());
  }, [editingBaselineDraft, editingIndex]);

  const buildNextHoleStats = (
    nextBaseHoleStats: HoleStats,
    nextTrail: PlannerShot[],
    nextDraft: PersistedPlannerDraft,
    options: { clearManualTrackScore?: boolean } = {},
  ): HoleStats => ({
    ...applyVirtualCaddyTrailToHole(nextBaseHoleStats, nextTrail),
    manualScoreEnteredOnTrack: options.clearManualTrackScore ? false : Boolean(holeStats.manualScoreEnteredOnTrack),
    virtualCaddyState: {
      version: 1,
      baseHoleStats: stripVirtualCaddyState(nextBaseHoleStats),
      trail: nextTrail,
      draft: nextDraft,
    },
  });

  const restoreSnapshot = (snapshot: PlannerSnapshot) => {
    setBaseHoleStats(snapshot.baseHoleStats);
    setTrail(snapshot.trail);
    setNextShotId(snapshot.draft.nextShotId);
    setFlowStep(snapshot.draft.flowStep);
    setActionType(snapshot.draft.actionType);
    setSeededDistanceMeters(snapshot.draft.seededDistanceMeters);
    setDistanceToHoleMeters(snapshot.draft.distanceToHoleMeters);
    setDistanceToMiddleMeters(snapshot.draft.distanceToMiddleMeters);
    setDistanceMode(snapshot.draft.distanceMode);
    setSurface(snapshot.draft.surface);
    setLieQuality(snapshot.draft.lieQuality);
    setSlope(snapshot.draft.slope);
    setBunkerLie(snapshot.draft.bunkerLie);
    setTemperature(snapshot.draft.temperature);
    setWindDirection(snapshot.draft.windDirection);
    setWindStrength(snapshot.draft.windStrength);
    setHazards(snapshot.draft.hazards);
    setSelectedClub(snapshot.draft.selectedClub);
    setShowClubOverride(snapshot.draft.showClubOverride);
    setShowAllOverrideClubs(false);
    setResultModeOverride(snapshot.draft.resultModeOverride ?? null);
    setOopResult(snapshot.draft.oopResult);
    setOutcomeSelection(snapshot.draft.outcomeSelection);
    setFirstPuttDistanceMeters(snapshot.draft.firstPuttDistanceMeters);
    setPuttCount(snapshot.draft.puttCount);
    setPenaltyStrokes(snapshot.draft.penaltyStrokes ?? 0);
    setPuttMissLong(snapshot.draft.puttMissLong);
    setPuttMissShort(snapshot.draft.puttMissShort);
    setPuttMissWithin2m(snapshot.draft.puttMissWithin2m);
    setShowRecommendationWhy(snapshot.draft.showRecommendationWhy);
    setShowPuttingDetails(snapshot.draft.showPuttingDetails);
    setShowPenaltyPicker((snapshot.draft.penaltyStrokes ?? 0) > 0);
    setShowAdvanced(snapshot.draft.showAdvanced);
  };

  useEffect(() => {
    const persistedState = sanitizePersistedState(holeStats.virtualCaddyState);
    if (persistedState) {
      const persistedDraft = persistedState.draft as PersistedPlannerDraft;
      const persistedTrail = Array.isArray(persistedState.trail) ? (persistedState.trail as PlannerShot[]) : [];
      const persistedBaseHoleStats =
        persistedState.baseHoleStats && typeof persistedState.baseHoleStats === 'object'
          ? (persistedState.baseHoleStats as HoleStats)
          : stripVirtualCaddyState(holeStats);

      setBaseHoleStats(stripVirtualCaddyState(persistedBaseHoleStats));
      setTrail(persistedTrail);
      setNextShotId(Number(persistedDraft.nextShotId || persistedTrail.length + 1));
      {
        const persistedFlowStep = (persistedDraft.flowStep as VirtualCaddyFlowStep) || 'overview';
        const persistedActionType = (persistedDraft.actionType as PlannerActionType) || 'tee';
        const normalizedFlowStep =
          persistedActionType === 'putting' && persistedFlowStep === 'setup'
            ? 'action'
            : persistedTrail.length > 0 && persistedFlowStep === 'overview'
              ? 'setup'
              : persistedFlowStep;
        setFlowStep(normalizedFlowStep);
      }
      setActionType((persistedDraft.actionType as PlannerActionType) || 'tee');
      setSeededDistanceMeters(Number(persistedDraft.seededDistanceMeters || defaultDistanceMeters || 150));
      setDistanceToHoleMeters(Number(persistedDraft.distanceToHoleMeters || persistedDraft.seededDistanceMeters || defaultDistanceMeters || 150));
      setDistanceToMiddleMeters(Number(persistedDraft.distanceToMiddleMeters || defaultDistanceMeters || 150));
      setDistanceMode(persistedDraft.distanceMode === 'point' ? 'point' : 'hole');
      setSurface((persistedDraft.surface as NonNullable<VirtualCaddyInputs['surface']>) || 'tee');
      setLieQuality((persistedDraft.lieQuality as NonNullable<VirtualCaddyInputs['lieQuality']>) || 'good');
      setSlope((persistedDraft.slope as NonNullable<VirtualCaddyInputs['slope']>) || 'flat');
      setBunkerLie((persistedDraft.bunkerLie as VirtualCaddyBunkerLie) || 'clean');
      setTemperature((persistedDraft.temperature as NonNullable<VirtualCaddyInputs['temperature']>) || 'normal');
      setWindDirection((persistedDraft.windDirection as NonNullable<VirtualCaddyInputs['windDirection']>) || 'none');
      setWindStrength((persistedDraft.windStrength as NonNullable<VirtualCaddyInputs['windStrength']>) || 'calm');
      setHazards(Array.isArray(persistedDraft.hazards) ? (persistedDraft.hazards as VirtualCaddyHazardSide[]) : []);
      setSelectedClub(typeof persistedDraft.selectedClub === 'string' ? persistedDraft.selectedClub : null);
      setShowClubOverride(Boolean(persistedDraft.showClubOverride));
      setShowAllOverrideClubs(false);
      setResultModeOverride(
        persistedDraft.resultModeOverride === 'gir' || persistedDraft.resultModeOverride === 'fairway'
          ? persistedDraft.resultModeOverride
          : null,
      );
      setOopResult((persistedDraft.oopResult as 'none' | 'look' | 'noLook') || 'none');
      setOutcomeSelection((persistedDraft.outcomeSelection as VirtualCaddyOutcomeSelection | null) ?? null);
      setFirstPuttDistanceMeters(typeof persistedDraft.firstPuttDistanceMeters === 'number' ? persistedDraft.firstPuttDistanceMeters : null);
      setPuttCount(typeof persistedDraft.puttCount === 'number' ? persistedDraft.puttCount : null);
      setPenaltyStrokes(Math.max(0, Math.floor(Number(persistedDraft.penaltyStrokes || 0))));
      setPuttMissLong(Number(persistedDraft.puttMissLong || 0));
      setPuttMissShort(Number(persistedDraft.puttMissShort || 0));
      setPuttMissWithin2m(Number(persistedDraft.puttMissWithin2m || 0));
      setAwaitingHoleAdvance(false);
      setShowRecommendationWhy(Boolean(persistedDraft.showRecommendationWhy));
      setShowPenaltyPicker(Math.max(0, Math.floor(Number(persistedDraft.penaltyStrokes || 0))) > 0);
      setShowPuttingDetails(
        typeof persistedDraft.showPuttingDetails === 'boolean'
          ? persistedDraft.showPuttingDetails
          : Number(persistedDraft.puttMissLong || 0) > 0 ||
              Number(persistedDraft.puttMissShort || 0) > 0 ||
              Number(persistedDraft.puttMissWithin2m || 0) > 0,
      );
      setShowAdvanced(Boolean(persistedDraft.showAdvanced));
      setEditingIndex(null);
      setEditingSnapshot(null);
      setEditingOriginalShot(null);
      setEditingBaselineDraft(null);
      return;
    }

    setBaseHoleStats(stripVirtualCaddyState(holeStats));
    setTrail([]);
    setNextShotId(1);
    setFlowStep('overview');
    setActionType('tee');
    resetDraft(defaultDistanceMeters ?? 150, 'tee');
    setEditingIndex(null);
    setEditingSnapshot(null);
    setEditingOriginalShot(null);
    setEditingBaselineDraft(null);
  }, [defaultDistanceMeters, hole]);

  useEffect(() => {
    const nextHoleStats = buildNextHoleStats(baseHoleStats, trail, buildPersistedDraft());
    const serializedNextHoleStats = JSON.stringify(nextHoleStats);

    if (lastSyncedHoleStatsRef.current === serializedNextHoleStats) {
      return;
    }

    lastSyncedHoleStatsRef.current = serializedNextHoleStats;
    replaceHoleStatsRef.current(nextHoleStats);
  }, [
    actionType,
    baseHoleStats,
    bunkerLie,
    distanceToHoleMeters,
    distanceToMiddleMeters,
    distanceMode,
    hazards,
    lieQuality,
    nextShotId,
    flowStep,
    oopResult,
    outcomeSelection,
    firstPuttDistanceMeters,
    puttCount,
    penaltyStrokes,
    puttMissLong,
    puttMissShort,
    puttMissWithin2m,
    showRecommendationWhy,
    selectedClub,
    showClubOverride,
    showPuttingDetails,
    seededDistanceMeters,
    showAdvanced,
    slope,
    surface,
    temperature,
    trail,
    windDirection,
    windStrength,
  ]);

  useEffect(() => {
    if (actionType === 'chipping' && (distanceToMiddleMeters > CHIPPING_MAX_DISTANCE_METERS || distanceMode === 'point')) {
      setActionType('shot');
    }
  }, [actionType, distanceMode, distanceToMiddleMeters]);

  useEffect(() => {
    if (actionType === 'shot' && distanceMode === 'hole' && distanceToMiddleMeters < CHIPPING_MAX_DISTANCE_METERS) {
      setActionType('chipping');
    }
  }, [actionType, distanceMode, distanceToMiddleMeters]);

  const shotNumber = trail.length + 1;
  const isFirstShot = trail.length === 0;
  const showOverviewStep = isFirstShot;
  const isTeeShot = actionType === 'tee';
  const isPutting = actionType === 'putting';
  const isChipping = actionType === 'chipping';
  const isStandardShot = actionType === 'tee' || actionType === 'shot';
  const useCompassResultLayout = !isPutting && !isChipping;
  const shotLabel = getShotLabel(shotNumber, actionType);
  const displayShotLabel =
    !isPutting && ((distanceMode === 'point' && distanceToMiddleMeters === 0) || (distanceMode === 'hole' && distanceToHoleMeters === 0))
      ? 'Putting'
      : shotLabel;
  const recommendationDistanceMeters = distanceMode === 'point' ? distanceToMiddleMeters : distanceToHoleMeters;
  const carryBook = useMemo(() => getCarryBook(carryByClub), [carryByClub]);
  const wedgeMatrixSources = useMemo(
    () =>
      wedgeMatrices.map((matrix) => ({
        matrix,
        entries: wedgeEntriesByMatrix[matrix.id] ?? [],
      })),
    [wedgeEntriesByMatrix, wedgeMatrices],
  );
  const longestCarry = useMemo(() => getLongestClubCarry(carryByClub), [carryByClub]);
  const baseRecommendation = useMemo(() => {
    if (isPutting) {
      return null;
    }

    return getVirtualCaddyRecommendation({
      distanceToMiddleMeters: recommendationDistanceMeters,
      surface,
      lieQuality,
      slope,
      bunkerLie,
      temperature,
      windDirection,
      windStrength,
      hazards,
      carryByClub,
      wedgeMatrices: wedgeMatrixSources,
    });
  }, [
    bunkerLie,
    carryByClub,
    hazards,
    isChipping,
    isPutting,
    lieQuality,
    recommendationDistanceMeters,
    slope,
    surface,
    temperature,
    wedgeMatrixSources,
    windDirection,
    windStrength,
  ]);
  const isWedgeMatrixChip = Boolean(isChipping && baseRecommendation?.wedgeMatrixRecommendation);
  const clubChoice = useMemo(() => {
    if (isPutting) {
      return { club: 'Putter', carry: 0 };
    }

    if (selectedClub) {
      const selectedMatch = carryBook.find((entry) => entry.club === selectedClub);
      if (selectedMatch) {
        return selectedMatch;
      }
    }

    if (isChipping) {
      if (baseRecommendation?.wedgeMatrixRecommendation) {
        return {
          club: baseRecommendation.wedgeMatrixRecommendation.club,
          carry: baseRecommendation.wedgeMatrixRecommendation.distanceMeters,
        };
      }

      return { club: 'Chip shot', carry: Math.max(0, distanceToMiddleMeters) };
    }

    if (!baseRecommendation) {
      return { club: 'Club', carry: 0 };
    }

    if (baseRecommendation?.wedgeMatrixRecommendation) {
      return {
        club: baseRecommendation.wedgeMatrixRecommendation.club,
        carry: baseRecommendation.wedgeMatrixRecommendation.distanceMeters,
      };
    }

    const matched = carryBook.find((entry) => entry.club === baseRecommendation.recommendedClub);
    return matched ?? carryBook[carryBook.length - 1] ?? { club: baseRecommendation.recommendedClub, carry: 0 };
  }, [baseRecommendation, carryBook, distanceToMiddleMeters, isChipping, isPutting, selectedClub]);
  const recommendation = {
    club: clubChoice.club,
    carryMeters: clubChoice.carry,
    effectiveDistanceMeters: baseRecommendation?.details.effectiveDistanceMeters ?? 0,
    reasons: baseRecommendation?.reasons ?? [],
    source: baseRecommendation?.source ?? 'carryBook',
    swingClock: baseRecommendation?.wedgeMatrixRecommendation?.swingClock ?? null,
    wedgeMatrixName: baseRecommendation?.wedgeMatrixName ?? null,
    wedgeMatrixSetup: baseRecommendation?.wedgeMatrixSetup ?? null,
    summary: isPutting
      ? 'On the green. Finish the hole with the putter.'
      : isChipping
        ? isWedgeMatrixChip && baseRecommendation?.wedgeMatrixRecommendation
          ? `${clubChoice.club} ${baseRecommendation.wedgeMatrixRecommendation.swingClock} from the wedge matrix for ${baseRecommendation.details.effectiveDistanceMeters}m effective.`
          : 'Missed the green. Play the chip and then move to putting.'
        : baseRecommendation?.wedgeMatrixRecommendation
          ? `${clubChoice.club} ${baseRecommendation.wedgeMatrixRecommendation.swingClock} from the wedge matrix for ${baseRecommendation.details.effectiveDistanceMeters}m effective.`
          : `${clubChoice.club} selected for ${baseRecommendation?.details.effectiveDistanceMeters ?? recommendationDistanceMeters}m effective.`,
  };
  const displayedCarryBook = useMemo(() => carryBook.slice().reverse(), [carryBook]);
  const overrideRecommendedClub = baseRecommendation?.recommendedClub ?? recommendation.club;
  const visibleOverrideClubs = useMemo(() => {
    if (showAllOverrideClubs) {
      return displayedCarryBook;
    }

    const recommendedIndex = displayedCarryBook.findIndex((entry) => entry.club === overrideRecommendedClub);
    if (recommendedIndex === -1) {
      return displayedCarryBook.slice(0, 7);
    }

    const startIndex = Math.max(0, recommendedIndex - 3);
    const endIndex = Math.min(displayedCarryBook.length, recommendedIndex + 4);
    return displayedCarryBook.slice(startIndex, endIndex);
  }, [displayedCarryBook, overrideRecommendedClub, showAllOverrideClubs]);
  const canShowAllOverrideClubs = visibleOverrideClubs.length < displayedCarryBook.length;
  const canOverrideClub = !isPutting;
  const hasCustomContext =
    ((!isPutting && surface !== (isTeeShot ? 'tee' : 'fairway')) ||
    lieQuality !== 'good' ||
    slope !== 'flat' ||
    (surface === 'bunker' && bunkerLie !== 'clean') ||
    temperature !== 'normal' ||
    windDirection !== 'none' ||
    windStrength !== 'calm' ||
    hazards.length > 0);
  const defaultOutcomeMode = distanceMode === 'point' ? (distanceToMiddleMeters === 0 ? 'gir' : 'fairway') : getOutcomeMode(distanceToHoleMeters, displayHolePar, longestCarry);
  const outcomeMode = resultModeOverride ?? defaultOutcomeMode;
  const outcomeOptions = isPutting
    ? []
    : isChipping
      ? CHIP_OUTCOME_OPTIONS
      : getOutcomeOptions(outcomeMode);
  const canOverrideOutcomeMode = isStandardShot && defaultOutcomeMode === 'fairway';
  const isHoleComplete =
    trail.length > 0 &&
    (trail[trail.length - 1].outcomeSelection === 'puttHoled' || trail[trail.length - 1].outcomeSelection === 'girHoled');
  const previousShot = trail[trail.length - 1];
  const currentDraft = buildPersistedDraft();
  const isEditDirty = editingBaselineDraft
    ? JSON.stringify(buildComparableDraft(currentDraft)) !== JSON.stringify(buildComparableDraft(editingBaselineDraft))
    : true;
  const canSaveShot = (isPutting ? puttCount != null : outcomeSelection != null) && (editingIndex == null || isEditDirty);
  const overviewTitle = isFirstShot ? 'Hole details' : 'Distance left';
  const completedHoleSummary = summarizeCompletedHole(trail, displayHolePar);
  const completedHoleScoreStyle = getScoreSummaryStyle(completedHoleSummary.par, completedHoleSummary.score);
  const finalShot = trail[trail.length - 1] ?? null;
  const isDirectHoledFinish = finalShot?.outcomeSelection === 'girHoled';
  const isHoleInOneFinish = isDirectHoledFinish && trail.length === 1 && finalShot?.actionType === 'tee';
  const showHoledCelebration = isDirectHoledFinish && !isHoleInOneFinish;
  const completionCardClassName = isHoleInOneFinish
    ? 'prototype-block virtual-caddy-complete virtual-caddy-complete-hole-in-one'
    : showHoledCelebration
      ? 'prototype-block virtual-caddy-complete virtual-caddy-complete-celebration'
      : 'prototype-block virtual-caddy-complete';
  const completionTitle = isHoleInOneFinish ? 'Hole in one' : isDirectHoledFinish ? 'Holed out' : 'Hole summary';
  const completionDetail = isHoleInOneFinish
    ? `${finalShot?.club ?? 'Shot'} never left the cup.`
    : isDirectHoledFinish && finalShot
      ? `Holed from ${finalShot.distanceStartMeters}m with ${finalShot.club}.`
      : null;
  const showOnGreenBanner = isPutting && distanceToHoleMeters === 0;
  const overviewDistanceSummary = isFirstShot
    ? defaultDistanceMeters != null
      ? `Length ${defaultDistanceMeters}m`
      : null
    : `Distance left ${distanceToHoleMeters}m`;
  const shotDistanceBannerLabel = isPutting
    ? showOnGreenBanner
      ? 'On the green'
      : 'Distance left'
    : distanceMode === 'point'
      ? 'Distance to target'
      : 'Distance to green';
  const shotDistanceBannerValue = isPutting
    ? showOnGreenBanner
      ? null
      : `${distanceToHoleMeters}m`
    : distanceMode === 'point'
      ? `${distanceToMiddleMeters}m`
      : `${distanceToHoleMeters}m`;
  const canResetShotDistanceBanner = distanceMode === 'point' ? distanceToMiddleMeters !== distanceToHoleMeters : distanceToHoleMeters !== seededDistanceMeters;
  const resetShotDistanceBanner = () => {
    if (distanceMode === 'point') {
      setShotDistance(distanceToHoleMeters);
      return;
    }
    setHoleDistance(seededDistanceMeters);
  };
  const distanceSliderMax = Math.max(300, seededDistanceMeters, distanceToHoleMeters, distanceToMiddleMeters);
  const showOopOptions =
    !isPutting && (isOopSurface(surface) || (trail.length >= 2 && !isGreenHitOutcome(previousShot?.outcomeSelection ?? null)));
  const toggleHazard = (hazard: VirtualCaddyHazardSide) => {
    setHazards((prev) => (prev.includes(hazard) ? prev.filter((item) => item !== hazard) : [...prev, hazard]));
  };
  const setOutcomeModeOverrideValue = (nextMode: 'fairway' | 'gir') => {
    setResultModeOverride(nextMode === defaultOutcomeMode ? null : nextMode);
    setOutcomeSelection((prev) => {
      if (!prev) {
        return prev;
      }

      if (nextMode === 'gir' && prev.startsWith('fairway')) {
        return null;
      }
      if (nextMode === 'fairway' && prev.startsWith('gir')) {
        return null;
      }
      return prev;
    });
  };

  useEffect(() => {
    if (!(isStandardShot && defaultOutcomeMode === 'fairway')) {
      setResultModeOverride(null);
    }
  }, [defaultOutcomeMode, isStandardShot]);
  const setHoleDistance = (nextDistanceMeters: number) => {
    const clampedDistance = clampDistanceMeters(nextDistanceMeters);
    setDistanceToHoleMeters(clampedDistance);
    if (distanceMode === 'hole') {
      setDistanceToMiddleMeters(clampedDistance);
      return;
    }
    setDistanceToMiddleMeters((prev) => Math.min(prev, clampedDistance));
  };
  const setShotDistance = (nextDistanceMeters: number) => {
    setDistanceToMiddleMeters(Math.min(clampDistanceMeters(nextDistanceMeters), distanceToHoleMeters));
  };
  const switchToHoleDistanceMode = () => {
    setDistanceMode('hole');
    setDistanceToMiddleMeters(distanceToHoleMeters);
  };
  const switchToPointDistanceMode = () => {
    if (distanceMode === 'point') {
      return;
    }

    const currentHoleDistance = distanceToHoleMeters;
    const restoredHoleDistance = Math.max(currentHoleDistance, seededDistanceMeters);
    setDistanceMode('point');
    setDistanceToHoleMeters(restoredHoleDistance);
    setDistanceToMiddleMeters(Math.min(currentHoleDistance, restoredHoleDistance));
  };
  const incrementPuttCount = () => {
    setPuttCount((prev) => {
      const nextValue = prev == null ? 4 : Math.max(4, prev + 1);
      setOutcomeSelection('puttHoled');
      return nextValue;
    });
  };
  const incrementPenaltyStrokes = () => {
    setPenaltyStrokes((prev) => Math.max(3, prev + 1));
  };
  const decrementPenaltyStrokes = () => {
    setPenaltyStrokes((prev) => {
      if (prev <= 3) {
        return Math.max(0, prev - 1);
      }

      return prev - 1;
    });
  };
  const decrementPuttCount = () => {
    setPuttCount((prev) => {
      if (prev == null) {
        return null;
      }

      const nextValue = Math.max(4, prev - 1);
      return nextValue;
    });
  };
  const setPuttDetailValue = (statKey: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m', nextValue: number) => {
    const safeValue = Math.max(0, Math.floor(nextValue));
    if (statKey === 'puttMissLong') {
      setPuttMissLong(safeValue);
      return;
    }
    if (statKey === 'puttMissShort') {
      setPuttMissShort(safeValue);
      return;
    }
    setPuttMissWithin2m(safeValue);
  };
  const getPuttDetailValue = (statKey: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m') => {
    if (statKey === 'puttMissLong') {
      return puttMissLong;
    }
    if (statKey === 'puttMissShort') {
      return puttMissShort;
    }
    return puttMissWithin2m;
  };
  const toggleCustomPuttDetailInput = (statKey: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m') => {
    const currentValue = getPuttDetailValue(statKey);
    setPuttDetailValue(statKey, currentValue >= 4 ? currentValue + 1 : 4);
  };
  const setFirstPuttDistance = (nextDistanceMeters: number) => {
    setFirstPuttDistanceMeters(Math.min(60, Math.max(1, Math.round(nextDistanceMeters))));
  };

  const getTrailRecordedDistanceMeters = (shot: PlannerShot, index: number) => {
    if (shot.actionType === 'putting' && typeof shot.firstPuttDistanceMeters === 'number' && shot.firstPuttDistanceMeters > 0) {
      return shot.firstPuttDistanceMeters;
    }

    const nextShot = trail[index + 1];
    if (nextShot) {
      return getActualDistanceFromStart(shot.distanceStartMeters, nextShot.distanceStartMeters);
    }

    if (!isHoleComplete) {
      return getActualDistanceFromStart(shot.distanceStartMeters, distanceToHoleMeters);
    }

    return getActualDistanceFromStart(shot.distanceStartMeters, shot.remainingDistanceMeters);
  };

  const saveShot = async () => {
    if (holeStats.manualScoreEnteredOnTrack) {
      const shouldContinue = window.confirm(
        'This hole score was manually changed on the Track page. Saving in Virtual Caddy will continue from here and replace that manual score flow. Continue?',
      );
      if (!shouldContinue) {
        return;
      }
    }

    let remainingDistanceMeters =
      outcomeSelection === 'girHit' || outcomeSelection === 'girHoled' || outcomeSelection === 'puttHoled'
        ? 0
        : distanceMode === 'point'
          ? Math.max(0, distanceToHoleMeters - distanceToMiddleMeters)
          : Math.max(0, distanceToHoleMeters - Math.max(0, recommendation.carryMeters));
    let nextActionType: PlannerActionType | null = 'shot';

    if (actionType === 'putting') {
      remainingDistanceMeters = 0;
      nextActionType = null;
    } else if (actionType === 'chipping') {
      if (outcomeSelection === 'chipOnGreen') {
        remainingDistanceMeters = 0;
        nextActionType = 'putting';
      } else {
        remainingDistanceMeters = 10;
        nextActionType = 'chipping';
      }
    } else if (outcomeMode === 'gir') {
      if (outcomeSelection === 'girHoled') {
        remainingDistanceMeters = 0;
        nextActionType = null;
      } else if (outcomeSelection === 'girHit') {
        remainingDistanceMeters = 0;
        nextActionType = 'putting';
      } else {
        remainingDistanceMeters = 10;
        nextActionType = 'chipping';
      }
    }

    if (editingSnapshot && editingIndex != null && onDeleteClubActualEntry) {
      const staleShots = editingSnapshot.trail.slice(editingIndex);
      for (const staleShot of staleShots) {
        if (typeof staleShot.clubActualEntryId === 'number' && staleShot.clubActualEntryId > 0) {
          await onDeleteClubActualEntry(staleShot.clubActualEntryId);
        }
      }
    }

    const actualDistanceMeters =
      distanceMode === 'point' && actionType !== 'putting' && actionType !== 'chipping'
        ? Math.max(0, Math.min(distanceToHoleMeters, distanceToMiddleMeters))
        : getActualDistanceFromStart(distanceToHoleMeters, remainingDistanceMeters);
    let clubActualEntryId: number | null = null;
    if (
      onSaveClubActual &&
      shouldTrackClubActual({
        actionType,
        surface,
        club: recommendation.club,
      }) &&
      actualDistanceMeters > 0
    ) {
      clubActualEntryId = await onSaveClubActual({
        club: recommendation.club,
        actualMeters: actualDistanceMeters,
      });
    }

    const nextShot: PlannerShot = {
      id: nextShotId,
      hole,
      label: shotLabel,
      actionType,
      distanceStartMeters: distanceToHoleMeters,
      plannedDistanceMeters: distanceToMiddleMeters,
      remainingDistanceMeters,
      distanceMode,
      surface,
      lieQuality,
      slope,
      bunkerLie,
      temperature,
      windDirection,
      windStrength,
      hazards,
      club: recommendation.club,
      carryMeters: recommendation.carryMeters,
      firstPuttDistanceMeters,
      puttCount,
      penaltyStrokes,
      puttMissLong,
      puttMissShort,
      puttMissWithin2m,
      clubActualEntryId,
      scoreDelta: (actionType === 'putting' ? Math.max(1, puttCount ?? 1) : 1) + penaltyStrokes,
      oopResult: deriveOopResult(actionType, surface, oopResult),
      shotCategory: deriveShotCategory(actionType, surface, distanceToMiddleMeters, recommendation.club),
      inside100Over3: 0,
      outcomeSelection,
    };

    const nextTrail = [...trail, nextShot];
    const nextSurface =
      nextActionType === 'putting' ? 'fairway' : nextActionType === 'chipping' ? getSurfaceFromOutcome(outcomeSelection) : getSurfaceFromOutcome(outcomeSelection);
    const nextDraft = nextActionType
      ? buildPersistedDraft({
          nextShotId: nextShotId + 1,
          actionType: nextActionType,
          seededDistanceMeters: remainingDistanceMeters,
          distanceToHoleMeters: remainingDistanceMeters,
          distanceToMiddleMeters: remainingDistanceMeters,
          distanceMode: 'hole',
          surface: nextSurface,
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
          firstPuttDistanceMeters: nextActionType === 'putting' ? 10 : null,
          puttCount: null,
          penaltyStrokes: 0,
          puttMissLong: 0,
          puttMissShort: 0,
          puttMissWithin2m: 0,
          showRecommendationWhy: false,
          showPuttingDetails: false,
          showAdvanced: false,
        })
      : buildPersistedDraft({
          nextShotId: nextShotId + 1,
          resultModeOverride: null,
        });
    const nextHoleStats = buildNextHoleStats(baseHoleStats, nextTrail, nextDraft, { clearManualTrackScore: true });
    lastSyncedHoleStatsRef.current = JSON.stringify(nextHoleStats);
    replaceHoleStatsRef.current(nextHoleStats);
    setTrail(nextTrail);
    setNextShotId((prev) => prev + 1);
    setFlowStep(nextActionType === 'putting' ? 'action' : nextActionType ? 'setup' : 'action');
    if (nextActionType) {
      setActionType(nextActionType);
      resetDraft(remainingDistanceMeters, nextSurface);
    }
    let didPersist = true;
    if (saveHoleStatsRef.current) {
      didPersist = await saveHoleStatsRef.current(nextHoleStats);
    }
    if (didPersist && !nextActionType) {
      if (outcomeSelection === 'girHoled') {
        setAwaitingHoleAdvance(true);
      } else {
        onHoleComplete?.();
      }
    }
    setEditingIndex(null);
    setEditingSnapshot(null);
    setEditingOriginalShot(null);
    setEditingBaselineDraft(null);
    setShowPenaltyPicker(false);
  };

  const startEdit = (index: number) => {
    const shot = trail[index];
    const showAdvancedValue =
      (shot.actionType !== 'putting' && shot.surface !== 'fairway') ||
      shot.lieQuality !== 'good' ||
      shot.slope !== 'flat' ||
      (shot.surface === 'bunker' && shot.bunkerLie !== 'clean') ||
      shot.temperature !== 'normal' ||
      shot.windDirection !== 'none' ||
      shot.windStrength !== 'calm' ||
      shot.hazards.length > 0;
    setEditingIndex(index);
    setEditingOriginalShot(shot);
    setEditingBaselineDraft(null);
    setEditingSnapshot({
      baseHoleStats,
      trail,
      draft: currentDraft,
    });
    setTrail(trail.slice(0, index));
    setFlowStep(shot.actionType === 'putting' ? 'action' : 'setup');
    setActionType(shot.actionType);
    setDistanceToHoleMeters(shot.distanceStartMeters);
    setDistanceToMiddleMeters(shot.plannedDistanceMeters);
    setSeededDistanceMeters(shot.distanceStartMeters);
    setDistanceMode(shot.distanceMode);
    setSurface(shot.surface);
    setLieQuality(shot.lieQuality);
    setSlope(shot.slope);
    setBunkerLie(shot.bunkerLie);
    setTemperature(shot.temperature);
    setWindDirection(shot.windDirection);
    setWindStrength(shot.windStrength);
    setHazards(shot.hazards);
    setSelectedClub(shot.actionType === 'putting' ? null : carryBook.some((entry) => entry.club === shot.club) ? shot.club : null);
    setShowClubOverride(false);
    setShowAllOverrideClubs(false);
    setResultModeOverride(shot.outcomeSelection && shot.outcomeSelection.startsWith('gir') ? 'gir' : null);
    setOopResult(shot.oopResult);
    setOutcomeSelection(shot.outcomeSelection);
    setFirstPuttDistanceMeters(shot.firstPuttDistanceMeters ?? null);
    setPuttCount(shot.puttCount ?? null);
    setPenaltyStrokes(shot.penaltyStrokes ?? 0);
    setPuttMissLong(shot.puttMissLong ?? 0);
    setPuttMissShort(shot.puttMissShort ?? 0);
    setPuttMissWithin2m(shot.puttMissWithin2m ?? 0);
    setShowRecommendationWhy(false);
    setShowPuttingDetails((shot.puttMissLong ?? 0) > 0 || (shot.puttMissShort ?? 0) > 0 || (shot.puttMissWithin2m ?? 0) > 0);
    setShowPenaltyPicker((shot.penaltyStrokes ?? 0) > 0);
    setShowAdvanced(showAdvancedValue);
    setNextShotId(shot.id);
  };

  const cancelEdit = () => {
    if (!editingSnapshot) {
      return;
    }

    restoreSnapshot(editingSnapshot);
    setEditingIndex(null);
    setEditingSnapshot(null);
    setEditingOriginalShot(null);
    setEditingBaselineDraft(null);
  };

  return (
    <div className="track-distance-section virtual-caddy-section">
      <div className="virtual-caddy-panel active-panel">
        {!isHoleComplete ? (
          <>
            {showOverviewStep && flowStep === 'overview' ? (
              <div className="virtual-caddy-step">
                <div className="virtual-caddy-step-header">
                  <div className="virtual-caddy-step-title">
                    {!isFirstShot ? <span className="virtual-caddy-step-number">{shotNumber}</span> : null}
                    <div>
                      <h5>{overviewTitle}</h5>
                      {!isFirstShot && overviewDistanceSummary ? <p>{overviewDistanceSummary}</p> : null}
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="prototype-block virtual-caddy-distance-block">
                  <div className={isFirstShot ? 'virtual-caddy-overview-card virtual-caddy-overview-card-hole' : 'virtual-caddy-overview-card'}>
                    {isFirstShot ? (
                      <>
                        <div className="virtual-caddy-overview-detail virtual-caddy-overview-detail-primary">
                          <span>Hole</span>
                          <strong>{hole}</strong>
                        </div>
                        <div className="virtual-caddy-overview-row">
                          {displayHoleIndex != null ? (
                            <div className="virtual-caddy-overview-detail">
                              <span>Index</span>
                              <strong>{displayHoleIndex}</strong>
                            </div>
                          ) : null}
                          {displayHolePar != null ? (
                            <div className="virtual-caddy-overview-detail">
                              <span>Par</span>
                              <strong>{displayHolePar}</strong>
                            </div>
                          ) : null}
                          {defaultDistanceMeters != null ? (
                            <div className="virtual-caddy-overview-detail">
                              <span>Length</span>
                              <strong>{defaultDistanceMeters}m</strong>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="virtual-caddy-overview-hero">
                          <span className="virtual-caddy-overview-kicker">Distance left</span>
                          <strong>{`${distanceToHoleMeters}m`}</strong>
                        </div>
                        <div className="virtual-caddy-overview-details">
                          {displayHoleIndex != null ? (
                            <div className="virtual-caddy-overview-detail">
                              <span>Index</span>
                              <strong>{displayHoleIndex}</strong>
                            </div>
                          ) : null}
                          {displayHolePar != null ? (
                            <div className="virtual-caddy-overview-detail">
                              <span>Par</span>
                              <strong>{displayHolePar}</strong>
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="virtual-caddy-card-footer">
                  <button type="button" className="save-btn virtual-caddy-save-btn" onClick={() => setFlowStep('setup')}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {flowStep === 'setup' ? (
              <div className="virtual-caddy-step">
                <div className="virtual-caddy-step-header">
                  <div className="virtual-caddy-step-title">
                    <span className="virtual-caddy-step-number">{shotNumber}</span>
                    <div>
                      <h5>{displayShotLabel}</h5>
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="prototype-block virtual-caddy-distance-block">
                  {!isPutting ? (
                    <div className="virtual-caddy-overview-hero virtual-caddy-distance-hero">
                      <span className="virtual-caddy-overview-kicker">{shotDistanceBannerLabel}</span>
                      <div className="virtual-caddy-distance-hero-actions">
                        <strong>{shotDistanceBannerValue}</strong>
                        {canResetShotDistanceBanner ? (
                          <button type="button" className="setup-toggle" onClick={resetShotDistanceBanner}>
                            Reset
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {isPutting ? null : (
                    <>
                    {showOopOptions ? (
                      <div className="prototype-block">
                        <span className="quick-select-label">Out of position</span>
                        <div className="quick-select-row">
                          {[
                            { key: 'none', label: 'No' },
                            { key: 'look', label: 'Look' },
                            { key: 'noLook', label: 'No look' },
                          ].map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              className={oopResult === option.key ? 'choice-chip active' : 'choice-chip'}
                              onClick={() => setOopResult(option.key as 'none' | 'look' | 'noLook')}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {isStandardShot ? (
                      <div className="virtual-caddy-inline-toggle">
                        <span className="quick-select-label">Shot target</span>
                        <div className="quick-select-row">
                          <button
                            type="button"
                            className={distanceMode === 'hole' ? 'choice-chip active' : 'choice-chip'}
                            onClick={switchToHoleDistanceMode}
                          >
                            To green
                          </button>
                          <button
                            type="button"
                            className={distanceMode === 'point' ? 'choice-chip active' : 'choice-chip'}
                            onClick={switchToPointDistanceMode}
                          >
                            To target
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {distanceMode === 'point' ? (
                      <>
                        <div className="prototype-block">
                          <div className="distance-header">
                            <span>Distance to green</span>
                            <strong>{distanceToHoleMeters}m</strong>
                          </div>
                          <div className="virtual-caddy-slider-stack">
                            <div className="virtual-caddy-slider-only-row">
                              <input
                                type="range"
                                min={0}
                                max={distanceSliderMax}
                                step={1}
                                value={Math.min(distanceToHoleMeters, distanceSliderMax)}
                                aria-label="Virtual caddy distance left to hole"
                                onChange={(event) => setHoleDistance(Number(event.target.value))}
                              />
                            </div>
                            <div className="virtual-caddy-slider-row">
                              <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters - 5)}>
                                -5m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters - 1)}>
                                -1m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters + 1)}>
                                +1m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters + 5)}>
                                +5m
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="prototype-block">
                          <div className="distance-header">
                            <span>Distance to target</span>
                            <strong>{distanceToMiddleMeters}m</strong>
                          </div>
                          <div className="virtual-caddy-slider-stack">
                            <div className="virtual-caddy-slider-only-row">
                              <input
                                type="range"
                                min={0}
                                max={distanceSliderMax}
                                step={1}
                                value={Math.min(distanceToMiddleMeters, distanceSliderMax)}
                                aria-label="Virtual caddy distance to target"
                                onChange={(event) => setShotDistance(Number(event.target.value))}
                              />
                            </div>
                            <div className="virtual-caddy-slider-row">
                              <button type="button" className="choice-chip" onClick={() => setShotDistance(distanceToMiddleMeters - 5)}>
                                -5m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setShotDistance(distanceToMiddleMeters - 1)}>
                                -1m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setShotDistance(distanceToMiddleMeters + 1)}>
                                +1m
                              </button>
                              <button type="button" className="choice-chip" onClick={() => setShotDistance(distanceToMiddleMeters + 5)}>
                                +5m
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="virtual-caddy-slider-stack">
                          <div className="virtual-caddy-slider-only-row">
                            <input
                              type="range"
                              min={0}
                              max={distanceSliderMax}
                              step={1}
                              value={Math.min(distanceToHoleMeters, distanceSliderMax)}
                              aria-label="Virtual caddy distance to hole"
                              onChange={(event) => setHoleDistance(Number(event.target.value))}
                            />
                          </div>
                          <div className="virtual-caddy-slider-row">
                            <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters - 5)}>
                              -5m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters - 1)}>
                              -1m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters + 1)}>
                              +1m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setHoleDistance(distanceToHoleMeters + 5)}>
                              +5m
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    {!isPutting ? (
                      <div className="virtual-caddy-setup-actions">
                        <button type="button" className="setup-toggle" onClick={() => setShowAdvanced((prev) => !prev)} aria-expanded={showAdvanced}>
                          {showAdvanced ? 'Hide detail' : 'Add detail'}
                        </button>
                      </div>
                    ) : null}
                    {showAdvanced && !isPutting ? (
                      <div className="virtual-caddy-advanced">
                        <div className="prototype-block">
                          <span className="quick-select-label">Surface</span>
                          <div className="quick-select-row">
                            {SURFACE_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={surface === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setSurface(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {surface === 'bunker' ? (
                          <div className="prototype-block">
                            <span className="quick-select-label">Bunker lie</span>
                            <div className="quick-select-row">
                              {BUNKER_LIE_OPTIONS.map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  className={bunkerLie === option.key ? 'choice-chip active' : 'choice-chip'}
                                  onClick={() => setBunkerLie(option.key)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="prototype-block">
                          <span className="quick-select-label">Lie quality</span>
                          <div className="quick-select-row">
                            {LIE_QUALITY_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={lieQuality === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setLieQuality(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="prototype-block">
                          <span className="quick-select-label">Slope</span>
                          <div className="quick-select-row">
                            {SLOPE_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={slope === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setSlope(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="prototype-block">
                          <span className="quick-select-label">Wind</span>
                          <div className="quick-select-row">
                            {WIND_DIRECTION_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={windDirection === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setWindDirection(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          {windDirection !== 'none' ? (
                            <div className="quick-select-row">
                              {WIND_STRENGTH_OPTIONS.filter((option) => option.key !== 'calm').map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  className={windStrength === option.key ? 'choice-chip active' : 'choice-chip'}
                                  onClick={() => setWindStrength(option.key)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="prototype-block">
                          <span className="quick-select-label">Trouble</span>
                          <div className="quick-select-row">
                            {HAZARD_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={hazards.includes(option.key) ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => toggleHazard(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                  )}
                </div>
                <div className="virtual-caddy-card-footer">
                  {showOverviewStep ? (
                    <button type="button" className="setup-toggle" onClick={() => setFlowStep('overview')}>
                      Back
                    </button>
                  ) : null}
                  <button type="button" className="save-btn virtual-caddy-save-btn" onClick={() => setFlowStep('action')}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {flowStep === 'action' ? (
              <div className="virtual-caddy-step">
                <div className="virtual-caddy-step-header">
                  <div className="virtual-caddy-step-title">
                    <span className="virtual-caddy-step-number">{shotNumber}</span>
                    <div>
                      <h5>Execute</h5>
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="virtual-caddy-overview-hero virtual-caddy-distance-hero">
                  {shotDistanceBannerValue != null ? <span className="virtual-caddy-overview-kicker">{shotDistanceBannerLabel}</span> : null}
                  <strong>{shotDistanceBannerValue ?? shotDistanceBannerLabel}</strong>
                </div>
                {!isPutting &&
                (!isChipping || isWedgeMatrixChip) &&
                recommendation.effectiveDistanceMeters !== distanceToMiddleMeters ? (
                  <div className="virtual-caddy-distance-summary">
                    <div className="virtual-caddy-distance-summary-label">
                      <span>Effective distance</span>
                      <button
                        type="button"
                        className="virtual-caddy-inline-toggle-btn"
                        onClick={() => setShowRecommendationWhy((prev) => !prev)}
                        aria-expanded={showRecommendationWhy}
                      >
                        {showRecommendationWhy ? 'Hide why' : 'Why'}
                      </button>
                    </div>
                    <strong>{recommendation.effectiveDistanceMeters}m</strong>
                  </div>
                ) : null}
                <div className="virtual-caddy-recommendation">
                  <div className="virtual-caddy-recommendation-copy">
                    <div className={isChipping ? 'virtual-caddy-club-row virtual-caddy-club-row-chip' : 'virtual-caddy-club-row'}>
                      <div className="virtual-caddy-club-heading">
                        <strong>
                          <span className="virtual-caddy-club-line">
                            <span className="virtual-caddy-club-prefix">Club:</span>
                            {recommendation.club}
                            {!isPutting && (!isChipping || isWedgeMatrixChip) ? <span className="virtual-caddy-carry-inline">({recommendation.carryMeters}m carry)</span> : null}
                          </span>
                        </strong>
                        <div className="virtual-caddy-club-actions">
                          {canOverrideClub ? (
                            <button
                              type="button"
                              className="virtual-caddy-override-toggle"
                              onClick={() => {
                                setShowClubOverride((prev) => {
                                  const nextValue = !prev;
                                  if (!nextValue) {
                                    setShowAllOverrideClubs(false);
                                  }
                                  return nextValue;
                                });
                              }}
                              aria-expanded={showClubOverride}
                            >
                              {showClubOverride ? 'Hide override' : 'Override club'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {canOverrideClub && selectedClub && selectedClub !== baseRecommendation?.recommendedClub ? (
                        <div className="virtual-caddy-club-recommendation">Recommended: {baseRecommendation?.recommendedClub}</div>
                      ) : null}
                      {recommendation.source === 'wedgeMatrix' && recommendation.swingClock ? (
                        <div className="virtual-caddy-distance-summary virtual-caddy-wedge-matrix-summary">
                          <div className="virtual-caddy-distance-summary-label">
                            <span>Suggestion:</span>
                          </div>
                          <span className="virtual-caddy-wedge-matrix-summary-note">
                            Swing: {recommendation.swingClock}
                          </span>
                          {recommendation.wedgeMatrixSetup ? <span className="virtual-caddy-wedge-matrix-summary-note">{recommendation.wedgeMatrixSetup}</span> : null}
                          <div className="virtual-caddy-wedge-matrix-summary-source">
                            <strong className="virtual-caddy-wedge-matrix-summary-value">
                              {recommendation.wedgeMatrixName ?? 'Wedge matrix'}
                              <span className="virtual-caddy-wedge-matrix-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="4" y="5" width="16" height="14" rx="2" />
                                  <path d="M9.5 5v14" />
                                  <path d="M14.5 5v14" />
                                  <path d="M4 10h16" />
                                  <path d="M4 14h16" />
                                </svg>
                              </span>
                            </strong>
                          </div>
                        </div>
                      ) : null}
                      <div className="virtual-caddy-club-meta">
                        {isPutting ? <span>Finish out</span> : null}
                        {canOverrideClub && selectedClub && selectedClub !== baseRecommendation?.recommendedClub ? (
                          <button
                            type="button"
                            className="virtual-caddy-recommended-reset"
                            onClick={() => {
                              setSelectedClub(null);
                              setShowClubOverride(false);
                              setShowAllOverrideClubs(false);
                            }}
                          >
                            Reset to recommended
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {canOverrideClub && showClubOverride ? (
                      <div className="virtual-caddy-club-picker">
                        <div className="quick-select-row" role="group" aria-label="Virtual caddy club selection">
                          {visibleOverrideClubs.map((entry) => (
                            <button
                              key={entry.club}
                              type="button"
                              className={recommendation.club === entry.club ? 'choice-chip active' : 'choice-chip'}
                              onClick={() => {
                                setSelectedClub(entry.club === baseRecommendation?.recommendedClub ? null : entry.club);
                                setShowClubOverride(false);
                                setShowAllOverrideClubs(false);
                              }}
                            >
                              {entry.club}
                            </button>
                          ))}
                        </div>
                        {canShowAllOverrideClubs ? (
                          <button type="button" className="setup-toggle" onClick={() => setShowAllOverrideClubs(true)}>
                            Show all clubs
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {!isPutting && (!isChipping || isWedgeMatrixChip) ? (
                      <>
                        {showRecommendationWhy ? (
                          <div className="prototype-block virtual-caddy-notes">
                            <span className="quick-select-label">Why</span>
                            <ul className="virtual-caddy-reason-list">
                              {recommendation.reasons.length > 0 ? recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>Stock shot.</li>}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {isPutting ? (
                      <div className="prototype-block">
                        <div className="distance-header">
                          <span className="quick-select-label">1st putt distance</span>
                          <strong>{firstPuttDistanceMeters ?? 10}m</strong>
                        </div>
                        <div className="virtual-caddy-slider-stack">
                          <div className="virtual-caddy-slider-only-row">
                            <input
                              type="range"
                              min={1}
                              max={60}
                              step={1}
                              value={firstPuttDistanceMeters ?? 10}
                              aria-label="Virtual caddy first putt distance"
                              onChange={(event) => setFirstPuttDistance(Number(event.target.value))}
                            />
                          </div>
                          <div className="virtual-caddy-slider-row">
                            <button type="button" className="choice-chip" onClick={() => setFirstPuttDistance((firstPuttDistanceMeters ?? 10) - 5)}>
                              -5m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setFirstPuttDistance((firstPuttDistanceMeters ?? 10) - 1)}>
                              -1m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setFirstPuttDistance((firstPuttDistanceMeters ?? 10) + 1)}>
                              +1m
                            </button>
                            <button type="button" className="choice-chip" onClick={() => setFirstPuttDistance((firstPuttDistanceMeters ?? 10) + 5)}>
                              +5m
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="prototype-block virtual-caddy-inline-result">
                      <div className="virtual-caddy-inline-result-header">
                        <span className="quick-select-label">
                          {isPutting ? 'Putts' : isChipping ? 'Chip result' : outcomeMode === 'fairway' ? 'Fairway result' : 'Green result'}
                        </span>
                        <div className="virtual-caddy-inline-result-actions">
                          {isPutting ? (
                          <button
                            type="button"
                            className="setup-toggle virtual-caddy-result-toggle"
                            onClick={() => setShowPuttingDetails((prev) => !prev)}
                            aria-expanded={showPuttingDetails}
                          >
                            {showPuttingDetails ? 'Hide detail' : 'Add detail'}
                          </button>
                          ) : canOverrideOutcomeMode ? (
                          <button
                            type="button"
                            className="setup-toggle virtual-caddy-result-toggle"
                            onClick={() => setOutcomeModeOverrideValue(outcomeMode === 'fairway' ? 'gir' : 'fairway')}
                          >
                            {outcomeMode === 'fairway' ? 'Switch to green' : 'Switch to fairway'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={showPenaltyPicker || penaltyStrokes > 0 ? 'setup-toggle virtual-caddy-result-toggle active' : 'setup-toggle virtual-caddy-result-toggle'}
                            onClick={() => {
                              if (showPenaltyPicker || penaltyStrokes > 0) {
                                setPenaltyStrokes(0);
                                setShowPenaltyPicker(false);
                              } else {
                                setShowPenaltyPicker(true);
                              }
                            }}
                            aria-expanded={showPenaltyPicker || penaltyStrokes > 0}
                          >
                            Add penalty
                          </button>
                          {!isPutting && outcomeMode === 'gir' ? (
                            <button
                              type="button"
                              className={outcomeSelection === 'girHoled' ? 'setup-toggle virtual-caddy-result-toggle active' : 'setup-toggle virtual-caddy-result-toggle'}
                              onClick={() => setOutcomeSelection('girHoled')}
                            >
                              Holed
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {isPutting ? (
                        <div className="quick-select-row" role="group" aria-label="Virtual caddy putts selection">
                          {PUTT_COUNT_OPTIONS.map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={puttCount === value ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => {
                                  setPuttCount(value);
                                  setOutcomeSelection('puttHoled');
                                }}
                              >
                                {value}
                              </button>
                            )).concat([
                              <button
                                key="putt-plus"
                                type="button"
                                className={typeof puttCount === 'number' && puttCount >= 4 ? 'choice-chip active' : 'choice-chip'}
                                onClick={incrementPuttCount}
                                aria-expanded={typeof puttCount === 'number' && puttCount >= 4}
                                aria-label="Add more than 3 putts"
                              >
                                +
                              </button>,
                              ...(typeof puttCount === 'number' && puttCount >= 4
                                ? [
                                    <button
                                      key="putt-inline-value"
                                      type="button"
                                      className="counter-inline-value"
                                      onClick={decrementPuttCount}
                                      aria-label="Decrease custom putts value"
                                    >
                                      {puttCount}
                                    </button>,
                                  ]
                                : []),
                            ])}
                        </div>
                      ) : useCompassResultLayout ? (
                        <div className={`virtual-caddy-result-menu ${outcomeMode === 'fairway' ? 'fairway-menu' : 'gir-menu'}`} role="group" aria-label="Virtual caddy result selection">
                          {outcomeOptions
                            .filter((option) => option.key !== 'girHoled')
                            .map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={
                                  outcomeSelection === option.key
                                    ? `directional-btn ${getOutcomePositionClass(option.key)} active`
                                    : `directional-btn ${getOutcomePositionClass(option.key)}`
                                }
                                onClick={() => setOutcomeSelection(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <div className="quick-select-row virtual-caddy-result-grid">
                          {outcomeOptions
                            .filter((option) => option.key !== 'girHoled')
                            .map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={outcomeSelection === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setOutcomeSelection(option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                        </div>
                      )}
                      <div className="virtual-caddy-result-actions">
                          {showPenaltyPicker || penaltyStrokes > 0 ? (
                            <div className="quick-select-row" role="group" aria-label="Virtual caddy penalty selection">
                              {PENALTY_STROKE_OPTIONS.map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={penaltyStrokes === value ? 'choice-chip active' : 'choice-chip'}
                                  onClick={() => setPenaltyStrokes(value)}
                                >
                                  {value === 0 ? 'None' : `+${value}`}
                                </button>
                              )).concat([
                                <button
                                  key="penalty-plus"
                                  type="button"
                                  className={penaltyStrokes >= 3 ? 'choice-chip active' : 'choice-chip'}
                                  onClick={incrementPenaltyStrokes}
                                  aria-expanded={penaltyStrokes >= 3}
                                  aria-label="Add more than 2 penalty strokes"
                                >
                                  +
                                </button>,
                                ...(penaltyStrokes >= 3
                                  ? [
                                      <button
                                        key="penalty-inline-value"
                                        type="button"
                                        className="counter-inline-value"
                                        onClick={decrementPenaltyStrokes}
                                        aria-label="Decrease custom penalty strokes"
                                      >
                                        +{penaltyStrokes}
                                      </button>,
                                    ]
                                  : []),
                              ])}
                            </div>
                          ) : null}
                        </div>
                    </div>
                    {isPutting ? (
                      showPuttingDetails ? (
                        <div className="prototype-block">
                          <span className="quick-select-label">Detailed stats</span>
                          <div className="stat-list">
                            {PUTTING_DETAIL_OPTIONS.map((stat) => (
                              <div key={stat.key} className="counter-tile">
                                <div className="counter-tile-header">
                                  <span>{stat.label}</span>
                                  <div className="counter-value-grid" role="group" aria-label={`${stat.label} value`}>
                                    <button
                                      type="button"
                                      className={getPuttDetailValue(stat.key) === 0 ? 'counter-value-btn counter-reset-btn active' : 'counter-value-btn counter-reset-btn'}
                                      onClick={() => setPuttDetailValue(stat.key, 0)}
                                    >
                                      0
                                    </button>
                                    {[1, 2, 3].map((value) => (
                                      <button
                                        key={value}
                                        type="button"
                                        className={getPuttDetailValue(stat.key) === value ? 'counter-value-btn active' : 'counter-value-btn'}
                                        onClick={() => setPuttDetailValue(stat.key, value)}
                                      >
                                        {value}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      className={getPuttDetailValue(stat.key) >= 4 ? 'counter-value-btn active' : 'counter-value-btn'}
                                      onClick={() => toggleCustomPuttDetailInput(stat.key)}
                                      aria-expanded={getPuttDetailValue(stat.key) >= 4}
                                      aria-label={`Enter a custom value for ${stat.label}`}
                                    >
                                      +
                                    </button>
                                    {getPuttDetailValue(stat.key) >= 4 ? (
                                      <button
                                        type="button"
                                        className="counter-inline-value"
                                        onClick={() => setPuttDetailValue(stat.key, Math.max(4, getPuttDetailValue(stat.key) - 1))}
                                        aria-label={`Decrease custom value for ${stat.label}`}
                                      >
                                        {Math.max(4, getPuttDetailValue(stat.key))}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    ) : null}
                  </div>
                </div>
                <div className="virtual-caddy-card-footer">
                  {!isPutting ? (
                    <button type="button" className="setup-toggle" onClick={() => setFlowStep('setup')}>
                      Back
                    </button>
                  ) : null}
                  <button type="button" className="save-btn virtual-caddy-save-btn" disabled={!canSaveShot} onClick={saveShot}>
                    Save result
                  </button>
                </div>
              </div>
            ) : null}

            {hasCustomContext ? <p className="virtual-caddy-state-note">Recommendation adjusted for current conditions.</p> : null}

          </>
        ) : (
          <div className={completionCardClassName}>
            {showHoledCelebration ? (
              <div className="virtual-caddy-complete-burst" aria-hidden="true">
                <span className="virtual-caddy-complete-orbit virtual-caddy-complete-orbit-one" />
                <span className="virtual-caddy-complete-orbit virtual-caddy-complete-orbit-two" />
                <span className="virtual-caddy-complete-glow virtual-caddy-complete-glow-one" />
                <span className="virtual-caddy-complete-glow virtual-caddy-complete-glow-two" />
                <span className="virtual-caddy-complete-star virtual-caddy-complete-star-one" />
                <span className="virtual-caddy-complete-star virtual-caddy-complete-star-two" />
                <span className="virtual-caddy-complete-star virtual-caddy-complete-star-three" />
              </div>
            ) : null}
            <div className="virtual-caddy-complete-header">
              <span className="quick-select-label">{completionTitle}</span>
              {completionDetail ? <p>{completionDetail}</p> : null}
            </div>
            <div className="virtual-caddy-complete-summary">
              <div className="virtual-caddy-complete-stat">
                <span>Par</span>
                <strong>{completedHoleSummary.par ?? '-'}</strong>
              </div>
              <div className="virtual-caddy-complete-stat">
                <span>Score</span>
                <strong className={`virtual-caddy-score-mark virtual-caddy-score-mark-${completedHoleScoreStyle.tone}`}>{completedHoleSummary.score}</strong>
              </div>
              <div className="virtual-caddy-complete-stat">
                <span>Putts</span>
                <strong>{completedHoleSummary.putts}</strong>
              </div>
            </div>
            {awaitingHoleAdvance ? (
              <div className="virtual-caddy-card-footer">
                <button
                  type="button"
                  className="save-btn virtual-caddy-save-btn"
                  onClick={() => {
                    setAwaitingHoleAdvance(false);
                    onHoleComplete?.();
                  }}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        )}

        {trail.length > 0 ? (
          <div className="virtual-caddy-trail">
            {[...trail].reverse().map((shot) => {
              const index = trail.findIndex((entry) => entry.id === shot.id);
              return (
                <div key={shot.id} className="prototype-block virtual-caddy-trail-card">
                  <div className="virtual-caddy-trail-header">
                    <div className="virtual-caddy-trail-title">
                      <span className="virtual-caddy-trail-number">{index + 1}</span>
                      <span className="quick-select-label">{shot.label}</span>
                      <strong className="virtual-caddy-trail-club">
                        {shot.club} · {getTrailRecordedDistanceMeters(shot, index)}m
                      </strong>
                    </div>
                    <button type="button" className="setup-toggle" onClick={() => startEdit(index)}>
                      Edit
                    </button>
                  </div>
                  <p className="virtual-caddy-trail-summary">
                    {formatTrailSummary(shot)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
