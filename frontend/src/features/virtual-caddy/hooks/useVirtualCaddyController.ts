import { useEffect, useReducer, useRef } from 'react';

import type { VirtualCaddyOutcomeSelection } from '../../../lib/virtualCaddyExecution';
import { createInitialVirtualCaddyState, virtualCaddyReducer } from '../state/reducer';
import {
  getCanSaveShot,
  getCompletionSummary,
  getDefaultOutcomeMode,
  getDisplayShotLabel,
  getHasCustomContext,
  getIsChipping,
  getIsFirstShot,
  getIsHoleComplete,
  getIsPutting,
  getIsStandardShot,
  getIsTeeShot,
  getOutcomeOptions,
  getShowOopOptions,
  getShotNumber,
  getTrailRecordedDistanceMeters,
  getTrailSummary,
} from '../state/selectors';
import {
  buildComparableDraft,
  clampPreviousShotDistanceAdjustmentMeters,
  deriveOopResult,
  deriveShotCategory,
  getActualDistanceFromStart,
  getAdjustedMeasuredDistanceMeters,
  getShotLabel,
  getSurfaceFromOutcome,
  shouldTrackClubActual,
} from '../domain/planner';
import { CHIPPING_MAX_DISTANCE_METERS } from '../constants';
import { buildHydratedState, buildNextHoleStats, buildPersistedDraftFromState } from '../adapters/persistence';
import type { PersistedPlannerDraft, PlannerShot, VirtualCaddyPanelProps, VirtualCaddyState } from '../types';
import { useVirtualCaddyRecommendation } from './useVirtualCaddyRecommendation';
import { buildEditSnapshot, resolveShotTransition } from '../domain/shotLifecycle';

export function useVirtualCaddyController({
  hole,
  holeStats,
  displayHolePar,
  defaultDistanceMeters,
  carryByClub,
  wedgeMatrices = [],
  wedgeEntriesByMatrix = {},
  onReplaceHoleStats,
  onSaveHoleStats,
  onSaveClubActual,
  onDeleteClubActualEntry,
  onHoleComplete,
}: VirtualCaddyPanelProps) {
  const [state, dispatch] = useReducer(
    virtualCaddyReducer,
    buildHydratedState(holeStats, defaultDistanceMeters, createInitialVirtualCaddyState),
  );
  const lastSyncedHoleStatsRef = useRef<string | null>(null);
  const replaceHoleStatsRef = useRef(onReplaceHoleStats);
  const saveHoleStatsRef = useRef(onSaveHoleStats);

  useEffect(() => {
    replaceHoleStatsRef.current = onReplaceHoleStats;
  }, [onReplaceHoleStats]);

  useEffect(() => {
    saveHoleStatsRef.current = onSaveHoleStats;
  }, [onSaveHoleStats]);

  useEffect(() => {
    dispatch({ type: 'hydrate', payload: buildHydratedState(holeStats, defaultDistanceMeters, createInitialVirtualCaddyState) });
  }, [defaultDistanceMeters, hole]);

  const shotNumber = getShotNumber(state);
  const isFirstShot = getIsFirstShot(state);
  const isTeeShot = getIsTeeShot(state);
  const isPutting = getIsPutting(state);
  const isChipping = getIsChipping(state);
  const isStandardShot = getIsStandardShot(state);
  const displayShotLabel = getDisplayShotLabel(state);
  const { baseRecommendation, recommendation, displayedCarryBook, visibleOverrideClubs, longestCarry, wedgeMatrixSources, isWedgeMatrixChip } =
    useVirtualCaddyRecommendation({
      state,
      carryByClub,
      wedgeMatrices,
      wedgeEntriesByMatrix,
    });

  const defaultOutcomeMode = getDefaultOutcomeMode(state, displayHolePar, longestCarry);
  const outcomeMode = state.resultModeOverride ?? defaultOutcomeMode;
  const outcomeOptions = getOutcomeOptions(state, displayHolePar, longestCarry);
  const canOverrideOutcomeMode = isStandardShot && defaultOutcomeMode === 'fairway';
  const isHoleComplete = getIsHoleComplete(state);
  const currentDraft = buildPersistedDraftFromState(state);
  const isEditDirty = state.editingBaselineDraft
    ? JSON.stringify(buildComparableDraft(currentDraft)) !== JSON.stringify(buildComparableDraft(state.editingBaselineDraft))
    : true;
  const canSaveShot = getCanSaveShot(state) && (state.editingIndex == null || isEditDirty);
  const completedHoleSummary = getCompletionSummary(state, displayHolePar);
  const finalShot = state.trail[state.trail.length - 1] ?? null;
  const isDirectHoledFinish = finalShot?.outcomeSelection === 'girHoled';
  const isHoleInOneFinish = isDirectHoledFinish && state.trail.length === 1 && finalShot?.actionType === 'tee';
  const showHoledCelebration = isDirectHoledFinish && !isHoleInOneFinish;
  const showOopOptions = getShowOopOptions(state);
  const hasCustomContext = getHasCustomContext(state);

  useEffect(() => {
    if (state.actionType === 'chipping' && (state.distanceToMiddleMeters > CHIPPING_MAX_DISTANCE_METERS || state.distanceMode === 'point')) {
      dispatch({ type: 'setActionType', payload: 'shot' });
    }
  }, [state.actionType, state.distanceMode, state.distanceToMiddleMeters]);

  useEffect(() => {
    if (state.actionType === 'shot' && state.distanceMode === 'hole' && state.distanceToMiddleMeters < CHIPPING_MAX_DISTANCE_METERS) {
      dispatch({ type: 'setActionType', payload: 'chipping' });
    }
  }, [state.actionType, state.distanceMode, state.distanceToMiddleMeters]);

  useEffect(() => {
    if (!(isStandardShot && defaultOutcomeMode === 'fairway') && state.resultModeOverride != null) {
      dispatch({ type: 'patchDraft', payload: { resultModeOverride: null } });
    }
  }, [defaultOutcomeMode, isStandardShot, state.resultModeOverride]);

  useEffect(() => {
    if (state.editingIndex == null || state.editingBaselineDraft) {
      return;
    }
    dispatch({ type: 'patch', payload: { editingBaselineDraft: buildPersistedDraftFromState(state) } });
  }, [state, state.editingBaselineDraft, state.editingIndex]);

  useEffect(() => {
    const nextHoleStats = buildNextHoleStats(holeStats, state.baseHoleStats, state.trail, buildPersistedDraftFromState(state), {});
    const serializedNextHoleStats = JSON.stringify(nextHoleStats);

    if (lastSyncedHoleStatsRef.current === serializedNextHoleStats) {
      return;
    }

    lastSyncedHoleStatsRef.current = serializedNextHoleStats;
    replaceHoleStatsRef.current(nextHoleStats);
  }, [holeStats, state]);

  const startEdit = (index: number) => {
    const { shot, showAdvanced } = buildEditSnapshot(state.trail, index);
    dispatch({
      type: 'startEdit',
      payload: {
        index,
        shot,
        showAdvanced,
        snapshot: {
          baseHoleStats: state.baseHoleStats,
          trail: state.trail,
          draft: buildPersistedDraftFromState(state),
          persistedClubActualEntryIds: Array.isArray(holeStats.virtualCaddyState?.clubActualEntryIds)
            ? holeStats.virtualCaddyState.clubActualEntryIds.filter((entryId): entryId is number => typeof entryId === 'number' && entryId > 0)
            : [],
        },
      },
    });
  };

  const cancelEdit = () => {
    if (!state.editingSnapshot) {
      return;
    }
    dispatch({ type: 'cancelEdit', payload: state.editingSnapshot });
  };

  const getCompletedShotActualDistanceMeters = (trail: PlannerShot[], shot: PlannerShot, index: number) => {
    const followingShot = trail[index + 1];
    if (followingShot?.actionType === 'putting' && (shot.outcomeSelection === 'girHit' || shot.outcomeSelection === 'chipOnGreen')) {
      return getAdjustedMeasuredDistanceMeters(shot.plannedDistanceMeters, followingShot.previousShotDistanceAdjustmentMeters ?? 0);
    }
    return getActualDistanceFromStart(shot.distanceStartMeters, followingShot ? followingShot.distanceStartMeters : shot.remainingDistanceMeters);
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

    const { remainingDistanceMeters, nextActionType, nextSurface } = resolveShotTransition(state, outcomeMode, recommendation.carryMeters);

    if (state.editingSnapshot && state.editingIndex != null && onDeleteClubActualEntry) {
      const staleStartIndex = Math.max(0, state.editingIndex - 1);
      const staleShotEntryIds = state.editingSnapshot.trail
        .slice(staleStartIndex)
        .map((staleShot) => staleShot.clubActualEntryId)
        .filter((entryId): entryId is number => typeof entryId === 'number' && entryId > 0);
      const persistedEntryIds = state.editingSnapshot.persistedClubActualEntryIds;
      const staleEntryIds = Array.from(new Set([...persistedEntryIds, ...staleShotEntryIds]));

      for (const entryId of staleEntryIds) {
        await onDeleteClubActualEntry(entryId);
      }
    }

    const nextShotBase: PlannerShot = {
      id: state.nextShotId,
      hole,
      label: getShotLabel(shotNumber, state.actionType),
      actionType: state.actionType,
      distanceStartMeters: state.distanceToHoleMeters,
      plannedDistanceMeters: state.distanceToMiddleMeters,
      remainingDistanceMeters,
      distanceMode: state.distanceMode,
      surface: state.surface,
      lieQuality: state.lieQuality,
      slope: state.slope,
      bunkerLie: state.bunkerLie,
      temperature: state.temperature,
      windDirection: state.windDirection,
      windStrength: state.windStrength,
      hazards: state.hazards,
      club: recommendation.club,
      carryMeters: recommendation.carryMeters,
      firstPuttDistanceMeters: state.firstPuttDistanceMeters,
      previousShotDistanceAdjustmentMeters: state.actionType === 'putting' ? clampPreviousShotDistanceAdjustmentMeters(state.previousShotDistanceAdjustmentMeters) : null,
      puttCount: state.puttCount,
      penaltyStrokes: state.penaltyStrokes,
      puttMissLong: state.puttMissLong,
      puttMissShort: state.puttMissShort,
      puttMissWithin2m: state.puttMissWithin2m,
      clubActualEntryId: null,
      scoreDelta: (state.actionType === 'putting' ? Math.max(1, state.puttCount ?? 1) : 1) + state.penaltyStrokes,
      oopResult: deriveOopResult(state.actionType, state.surface, state.oopResult),
      shotCategory: deriveShotCategory(state.actionType, state.surface, state.distanceToMiddleMeters, recommendation.club),
      inside100Over3: 0,
      outcomeSelection: state.outcomeSelection as VirtualCaddyOutcomeSelection,
    };

    let nextTrail = [...state.trail, nextShotBase];
    if (nextActionType == null && onSaveClubActual) {
      nextTrail = await Promise.all(
        nextTrail.map(async (shot, index) => {
          if (!shouldTrackClubActual(shot)) {
            return { ...shot, clubActualEntryId: null };
          }

          const actualDistanceMeters = getCompletedShotActualDistanceMeters(nextTrail, shot, index);
          if (actualDistanceMeters <= 0) {
            return { ...shot, clubActualEntryId: null };
          }

          const clubActualEntryId = await onSaveClubActual({
            club: shot.club,
            actualMeters: actualDistanceMeters,
          });
          return {
            ...shot,
            clubActualEntryId,
          };
        }),
      );
    }
    const nextStateDraft = nextActionType
      ? buildPersistedDraftFromState(state, {
          nextShotId: state.nextShotId + 1,
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
          previousShotDistanceAdjustmentMeters: 0,
          puttCount: null,
          penaltyStrokes: 0,
          puttMissLong: 0,
          puttMissShort: 0,
          puttMissWithin2m: 0,
          showRecommendationWhy: false,
          showPuttingDetails: false,
          showAdvanced: false,
        })
      : buildPersistedDraftFromState(state, {
          nextShotId: state.nextShotId + 1,
          resultModeOverride: null,
        });
    const nextHoleStats = buildNextHoleStats(holeStats, state.baseHoleStats, nextTrail, nextStateDraft, { clearManualTrackScore: true });
    lastSyncedHoleStatsRef.current = JSON.stringify(nextHoleStats);
    replaceHoleStatsRef.current(nextHoleStats);
    let didPersist = true;
    if (saveHoleStatsRef.current) {
      didPersist = await saveHoleStatsRef.current(nextHoleStats);
    }
    if (didPersist && !nextActionType) {
      const didCompleteHole =
        nextActionType == null
          ? await onHoleComplete?.(nextHoleStats, {
              persistToServer: true,
              advanceHole: state.outcomeSelection !== 'girHoled',
            })
          : true;
      if (didCompleteHole === false) {
        return;
      }
    }

    dispatch({
      type: 'patch',
      payload: {
        baseHoleStats: nextHoleStats,
      },
    });
    dispatch({
      type: 'applySavedShot',
      payload: {
        nextTrail,
        nextShotId: state.nextShotId + 1,
        nextActionType,
        remainingDistanceMeters,
        nextSurface,
        awaitingHoleAdvance: Boolean(didPersist && !nextActionType && state.outcomeSelection === 'girHoled'),
      },
    });
  };

  const setFlowStep = (flowStep: 'overview' | 'setup' | 'action') => dispatch({ type: 'setFlowStep', payload: flowStep });
  const setHoleDistance = (distanceMeters: number) => dispatch({ type: 'setHoleDistance', payload: distanceMeters });
  const setShotDistance = (distanceMeters: number) => dispatch({ type: 'setShotDistance', payload: distanceMeters });
  const setDistanceMode = (distanceMode: 'hole' | 'point') => dispatch({ type: 'setDistanceMode', payload: distanceMode });
  const updateDraft = (payload: Partial<PersistedPlannerDraft>) => dispatch({ type: 'patchDraft', payload });
  const updateState = (payload: Partial<VirtualCaddyState>) => dispatch({ type: 'patch', payload });
  const toggleHazard = (hazard: NonNullable<typeof state.hazards[number]>) => dispatch({ type: 'toggleHazard', payload: hazard });
  const setOutcomeSelection = (outcomeSelection: VirtualCaddyOutcomeSelection | null) => dispatch({ type: 'setOutcomeSelection', payload: outcomeSelection });
  const setPuttCount = (puttCount: number | null) => dispatch({ type: 'setPuttCount', payload: puttCount });
  const setPuttDetail = (key: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m', value: number) =>
    dispatch({ type: 'setPuttDetail', payload: { key, value } });
  const setPenaltyStrokes = (penaltyStrokes: number) => dispatch({ type: 'setPenaltyStrokes', payload: penaltyStrokes });

  return {
    state,
    recommendation,
    baseRecommendation,
    shotNumber,
    isFirstShot,
    isTeeShot,
    isPutting,
    isChipping,
    isStandardShot,
    displayShotLabel,
    displayedCarryBook,
    visibleOverrideClubs,
    defaultOutcomeMode,
    outcomeMode,
    outcomeOptions,
    canOverrideOutcomeMode,
    canSaveShot,
    isHoleComplete,
    completedHoleSummary,
    finalShot,
    isHoleInOneFinish,
    showHoledCelebration,
    showOopOptions,
    hasCustomContext,
    getTrailRecordedDistanceMeters: (shot: PlannerShot, index: number) =>
      getTrailRecordedDistanceMeters(
        state.trail,
        shot,
        index,
        state.distanceToHoleMeters,
        isHoleComplete,
        state.actionType,
        state.previousShotDistanceAdjustmentMeters,
      ),
    getTrailSummary,
    actions: {
      saveShot,
      startEdit,
      cancelEdit,
      onHoleComplete,
      setFlowStep,
      setHoleDistance,
      setShotDistance,
      setDistanceMode,
      updateDraft,
      updateState,
      toggleHazard,
      setOutcomeSelection,
      setPuttCount,
      setPuttDetail,
      setPenaltyStrokes,
    },
  };
}
