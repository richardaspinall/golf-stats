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
  oopResult: 'none' | 'look' | 'noLook';
  outcomeSelection: VirtualCaddyOutcomeSelection | null;
  firstPuttDistanceMeters: number | null;
  puttCount: number | null;
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
  oopResult: shot.oopResult,
  outcomeSelection: shot.outcomeSelection,
  puttCount: shot.puttCount ?? null,
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
const isGreenHitOutcome = (outcomeSelection: VirtualCaddyOutcomeSelection | null) => outcomeSelection === 'girHit' || outcomeSelection === 'chipOnGreen';
const clampDistanceMeters = (distanceMeters: number) => Math.min(600, Math.max(1, distanceMeters));

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

  return formatOutcomeLabel(shot.outcomeSelection);
};

const formatTrailSummary = (shot: PlannerShot) => {
  if (shot.actionType === 'putting') {
    const firstPuttDistanceSuffix =
      typeof shot.firstPuttDistanceMeters === 'number' && shot.firstPuttDistanceMeters > 0 ? ` from ${shot.firstPuttDistanceMeters}m` : '';
    return `${shot.club}: ${formatTrailResultLabel(shot)}${firstPuttDistanceSuffix}`;
  }

  return `Started at ${shot.distanceStartMeters}m with ${shot.carryMeters}m carry. ${formatTrailResultLabel(shot)}.`;
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
  const [oopResult, setOopResult] = useState<'none' | 'look' | 'noLook'>('none');
  const [outcomeSelection, setOutcomeSelection] = useState<VirtualCaddyOutcomeSelection | null>(null);
  const [puttCount, setPuttCount] = useState<number | null>(null);
  const [firstPuttDistanceMeters, setFirstPuttDistanceMeters] = useState<number | null>(null);
  const [puttMissLong, setPuttMissLong] = useState(0);
  const [puttMissShort, setPuttMissShort] = useState(0);
  const [puttMissWithin2m, setPuttMissWithin2m] = useState(0);
  const [showRecommendationWhy, setShowRecommendationWhy] = useState(false);
  const [showPuttingDetails, setShowPuttingDetails] = useState(false);
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
    setOopResult('none');
    setOutcomeSelection(null);
    setPuttCount(null);
    setFirstPuttDistanceMeters(null);
    setPuttMissLong(0);
    setPuttMissShort(0);
    setPuttMissWithin2m(0);
    setShowRecommendationWhy(false);
    setShowPuttingDetails(false);
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
    oopResult,
    outcomeSelection,
    firstPuttDistanceMeters,
    puttCount,
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
    setOopResult(snapshot.draft.oopResult);
    setOutcomeSelection(snapshot.draft.outcomeSelection);
    setFirstPuttDistanceMeters(snapshot.draft.firstPuttDistanceMeters);
    setPuttCount(snapshot.draft.puttCount);
    setPuttMissLong(snapshot.draft.puttMissLong);
    setPuttMissShort(snapshot.draft.puttMissShort);
    setPuttMissWithin2m(snapshot.draft.puttMissWithin2m);
    setShowRecommendationWhy(snapshot.draft.showRecommendationWhy);
    setShowPuttingDetails(snapshot.draft.showPuttingDetails);
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
      setFlowStep((persistedDraft.flowStep as VirtualCaddyFlowStep) || 'overview');
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
      setOopResult((persistedDraft.oopResult as 'none' | 'look' | 'noLook') || 'none');
      setOutcomeSelection((persistedDraft.outcomeSelection as VirtualCaddyOutcomeSelection | null) ?? null);
      setFirstPuttDistanceMeters(typeof persistedDraft.firstPuttDistanceMeters === 'number' ? persistedDraft.firstPuttDistanceMeters : null);
      setPuttCount(typeof persistedDraft.puttCount === 'number' ? persistedDraft.puttCount : null);
      setPuttMissLong(Number(persistedDraft.puttMissLong || 0));
      setPuttMissShort(Number(persistedDraft.puttMissShort || 0));
      setPuttMissWithin2m(Number(persistedDraft.puttMissWithin2m || 0));
      setShowRecommendationWhy(Boolean(persistedDraft.showRecommendationWhy));
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
  const isTeeShot = actionType === 'tee';
  const isPutting = actionType === 'putting';
  const isChipping = actionType === 'chipping';
  const isStandardShot = actionType === 'tee' || actionType === 'shot';
  const shotLabel = getShotLabel(shotNumber, actionType);
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

    if (selectedClub) {
      const selectedMatch = carryBook.find((entry) => entry.club === selectedClub);
      if (selectedMatch) {
        return selectedMatch;
      }
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
  const canOverrideClub = !isPutting && !isChipping && recommendation.source !== 'wedgeMatrix';
  const hasCustomContext =
    (isStandardShot && surface !== (isTeeShot ? 'tee' : 'fairway')) ||
    lieQuality !== 'good' ||
    slope !== 'flat' ||
    (surface === 'bunker' && bunkerLie !== 'clean') ||
    temperature !== 'normal' ||
    windDirection !== 'none' ||
    windStrength !== 'calm' ||
    hazards.length > 0;
  const outcomeMode = distanceMode === 'point' ? 'fairway' : getOutcomeMode(distanceToHoleMeters, displayHolePar, longestCarry);
  const outcomeOptions = isPutting
    ? []
    : isChipping
      ? CHIP_OUTCOME_OPTIONS
      : getOutcomeOptions(outcomeMode);
  const isHoleComplete = trail.length > 0 && trail[trail.length - 1].outcomeSelection === 'puttHoled';
  const previousShot = trail[trail.length - 1];
  const currentDraft = buildPersistedDraft();
  const isEditDirty = editingBaselineDraft
    ? JSON.stringify(buildComparableDraft(currentDraft)) !== JSON.stringify(buildComparableDraft(editingBaselineDraft))
    : true;
  const canSaveShot = (isPutting ? puttCount != null : outcomeSelection != null) && (editingIndex == null || isEditDirty);
  const overviewTitle = isFirstShot ? 'Hole status' : 'Distance left';
  const distanceSliderMax = Math.max(300, seededDistanceMeters, distanceToHoleMeters, distanceToMiddleMeters);
  const showOopOptions =
    !isPutting && (isOopSurface(surface) || (trail.length >= 2 && !isGreenHitOutcome(previousShot?.outcomeSelection ?? null)));
  const toggleHazard = (hazard: VirtualCaddyHazardSide) => {
    setHazards((prev) => (prev.includes(hazard) ? prev.filter((item) => item !== hazard) : [...prev, hazard]));
  };
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
      outcomeSelection === 'girHit' || outcomeSelection === 'puttHoled'
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
      if (outcomeSelection === 'girHit') {
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
      puttMissLong,
      puttMissShort,
      puttMissWithin2m,
      clubActualEntryId,
      scoreDelta: actionType === 'putting' ? Math.max(1, puttCount ?? 1) : 1,
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
          oopResult: 'none',
          outcomeSelection: null,
          firstPuttDistanceMeters: nextActionType === 'putting' ? 10 : null,
          puttCount: null,
          puttMissLong: 0,
          puttMissShort: 0,
          puttMissWithin2m: 0,
          showRecommendationWhy: false,
          showPuttingDetails: false,
          showAdvanced: false,
        })
      : buildPersistedDraft({
          nextShotId: nextShotId + 1,
        });
    const nextHoleStats = buildNextHoleStats(baseHoleStats, nextTrail, nextDraft, { clearManualTrackScore: true });
    lastSyncedHoleStatsRef.current = JSON.stringify(nextHoleStats);
    replaceHoleStatsRef.current(nextHoleStats);
    setTrail(nextTrail);
    setNextShotId((prev) => prev + 1);
    setFlowStep(nextActionType === 'putting' ? 'setup' : nextActionType ? 'overview' : 'action');
    if (nextActionType) {
      setActionType(nextActionType);
      resetDraft(remainingDistanceMeters, nextSurface);
    }
    let didPersist = true;
    if (saveHoleStatsRef.current) {
      didPersist = await saveHoleStatsRef.current(nextHoleStats);
    }
    if (didPersist && !nextActionType) {
      onHoleComplete?.();
    }
    setEditingIndex(null);
    setEditingSnapshot(null);
    setEditingOriginalShot(null);
    setEditingBaselineDraft(null);
  };

  const startEdit = (index: number) => {
    const shot = trail[index];
    const showAdvancedValue =
      (shot.actionType !== 'putting' && shot.actionType !== 'chipping' && shot.surface !== 'fairway') ||
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
    setFlowStep('setup');
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
    setSelectedClub(shot.actionType === 'putting' || shot.actionType === 'chipping' ? null : shot.club);
    setShowClubOverride(false);
    setShowAllOverrideClubs(false);
    setOopResult(shot.oopResult);
    setOutcomeSelection(shot.outcomeSelection);
    setFirstPuttDistanceMeters(shot.firstPuttDistanceMeters ?? null);
    setPuttCount(shot.puttCount ?? null);
    setPuttMissLong(shot.puttMissLong ?? 0);
    setPuttMissShort(shot.puttMissShort ?? 0);
    setPuttMissWithin2m(shot.puttMissWithin2m ?? 0);
    setShowRecommendationWhy(false);
    setShowPuttingDetails((shot.puttMissLong ?? 0) > 0 || (shot.puttMissShort ?? 0) > 0 || (shot.puttMissWithin2m ?? 0) > 0);
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
            {flowStep === 'overview' ? (
              <div className="virtual-caddy-step">
                <div className="virtual-caddy-step-header">
                  <div className="virtual-caddy-step-title">
                    <span className="virtual-caddy-step-number">{shotNumber}</span>
                    <div>
                      <h5>{overviewTitle}</h5>
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="prototype-block virtual-caddy-distance-block">
                  <div className="virtual-caddy-overview-card">
                    <div className="virtual-caddy-overview-hero">
                      <span className="virtual-caddy-overview-kicker">{isFirstShot ? 'Hole' : 'Distance left'}</span>
                      <strong>{isFirstShot ? hole : `${distanceToHoleMeters}m`}</strong>
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
                      {isFirstShot && defaultDistanceMeters != null ? (
                        <div className="virtual-caddy-overview-detail">
                          <span>Start distance</span>
                          <strong>{defaultDistanceMeters}m</strong>
                        </div>
                      ) : null}
                    </div>
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
                      <h5>{shotLabel}</h5>
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="prototype-block virtual-caddy-distance-block">
                  {isPutting ? (
                    <div className="distance-header">
                      <span>On green</span>
                      <strong>Putting</strong>
                    </div>
                  ) : (
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
                    {distanceMode !== 'point' ? (
                      <div className="distance-header">
                        <span>Actual distance left</span>
                        <div className="distance-header-actions">
                          <strong>{distanceToHoleMeters}m</strong>
                          <button type="button" className="setup-toggle" onClick={() => setHoleDistance(seededDistanceMeters)}>
                            Reset
                          </button>
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
                            <div className="distance-header-actions">
                              <strong>{distanceToHoleMeters}m</strong>
                              <button type="button" className="setup-toggle" onClick={() => setHoleDistance(seededDistanceMeters)}>
                                Reset
                              </button>
                            </div>
                          </div>
                          <div className="virtual-caddy-slider-stack">
                            <div className="virtual-caddy-slider-only-row">
                              <input
                                type="range"
                                min={1}
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
                            <div className="distance-header-actions">
                              <strong>{distanceToMiddleMeters}m</strong>
                              <button type="button" className="setup-toggle" onClick={() => setShotDistance(distanceToHoleMeters)}>
                                Reset
                              </button>
                            </div>
                          </div>
                          <div className="virtual-caddy-slider-stack">
                            <div className="virtual-caddy-slider-only-row">
                              <input
                                type="range"
                                min={1}
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
                              min={1}
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
                    {isStandardShot ? (
                      <div className="virtual-caddy-setup-actions">
                        <button type="button" className="setup-toggle" onClick={() => setShowAdvanced((prev) => !prev)} aria-expanded={showAdvanced}>
                          {showAdvanced ? 'Hide detail' : 'Add detail'}
                        </button>
                      </div>
                    ) : null}
                    {showAdvanced && isStandardShot ? (
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
                  <button type="button" className="setup-toggle" onClick={() => setFlowStep('overview')}>
                    Back
                  </button>
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
                      <h5>Action to take</h5>
                    </div>
                  </div>
                  {editingIndex != null ? (
                    <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={cancelEdit}>
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="virtual-caddy-recommendation">
                  <div className="virtual-caddy-recommendation-copy">
                    <div className={isChipping ? 'virtual-caddy-club-row virtual-caddy-club-row-chip' : 'virtual-caddy-club-row'}>
                      <strong>
                        {recommendation.club}
                        {!isPutting && (!isChipping || isWedgeMatrixChip) ? <span className="virtual-caddy-carry-inline">({recommendation.carryMeters}m carry)</span> : null}
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
                      </strong>
                      <div className="virtual-caddy-club-meta">
                        {isPutting ? <span>Finish out</span> : null}
                        {recommendation.source === 'wedgeMatrix' && recommendation.swingClock ? (
                          <>
                            <span>
                              {recommendation.swingClock}
                              {recommendation.wedgeMatrixName ? ` · ${recommendation.wedgeMatrixName}` : ''}
                            </span>
                            {recommendation.wedgeMatrixSetup ? <span>{recommendation.wedgeMatrixSetup}</span> : null}
                          </>
                        ) : null}
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
                            Recommended: {baseRecommendation?.recommendedClub}
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
                        <div className="virtual-caddy-metrics">
                          <div className="virtual-caddy-metric">
                            <span>{distanceMode === 'point' ? 'Distance to target' : 'Distance to green'}</span>
                            <strong>{distanceToMiddleMeters}m</strong>
                          </div>
                          {recommendation.effectiveDistanceMeters !== distanceToMiddleMeters ? (
                            <div className="virtual-caddy-metric">
                              <div className="virtual-caddy-metric-topline">
                                <span>Effective</span>
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
                        </div>
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
                          <span>1st putt distance</span>
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
                        {isPutting ? (
                          <button
                            type="button"
                            className="setup-toggle"
                            onClick={() => setShowPuttingDetails((prev) => !prev)}
                            aria-expanded={showPuttingDetails}
                          >
                            {showPuttingDetails ? 'Hide detail' : 'Add detail'}
                          </button>
                        ) : null}
                      </div>
                      <div className="quick-select-row" role={isPutting ? 'group' : undefined} aria-label={isPutting ? 'Virtual caddy putts selection' : undefined}>
                        {isPutting
                          ? PUTT_COUNT_OPTIONS.map((value) => (
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
                            ])
                          : outcomeOptions.map((option) => (
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
                    <div className="virtual-caddy-card-footer">
                      <button type="button" className="setup-toggle" onClick={() => setFlowStep('setup')}>
                        Back
                      </button>
                      <button type="button" className="save-btn virtual-caddy-save-btn" disabled={!canSaveShot} onClick={saveShot}>
                        Execute
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {hasCustomContext ? <p className="virtual-caddy-state-note">Recommendation adjusted for current conditions.</p> : null}

          </>
        ) : (
          <div className="prototype-block virtual-caddy-complete">
            <span className="quick-select-label">Trail complete</span>
            <strong>Hole flow captured.</strong>
            <p className="hint">Use Edit on any prior action to replay the sequence from that point.</p>
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
