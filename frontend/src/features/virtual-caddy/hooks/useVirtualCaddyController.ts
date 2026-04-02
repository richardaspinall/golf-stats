import { useEffect, useMemo, useReducer, useRef } from 'react';

import type { WedgeMatrixSource } from '../../../lib/wedgeMatrix';
import {
  getCarryBook,
  getLongestClubCarry,
  getVirtualCaddyRecommendation,
} from '../../../lib/virtualCaddy';
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
import { buildComparableDraft, deriveOopResult, deriveShotCategory, getActualDistanceFromStart, getShotLabel, getSurfaceFromOutcome, shouldTrackClubActual } from '../domain/planner';
import { CHIPPING_MAX_DISTANCE_METERS } from '../constants';
import { buildHydratedState, buildNextHoleStats, buildPersistedDraftFromState } from '../adapters/persistence';
import type { PlannerActionType, PlannerShot, VirtualCaddyPanelProps, VirtualCaddyState } from '../types';

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
  const recommendationDistanceMeters = state.distanceMode === 'point' ? state.distanceToMiddleMeters : state.distanceToHoleMeters;
  const carryBook = useMemo(() => getCarryBook(carryByClub), [carryByClub]);
  const wedgeMatrixSources = useMemo<WedgeMatrixSource[]>(
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
      surface: state.surface,
      lieQuality: state.lieQuality,
      slope: state.slope,
      bunkerLie: state.bunkerLie,
      temperature: state.temperature,
      windDirection: state.windDirection,
      windStrength: state.windStrength,
      hazards: state.hazards,
      carryByClub,
      wedgeMatrices: wedgeMatrixSources,
    });
  }, [
    carryByClub,
    isPutting,
    recommendationDistanceMeters,
    state.bunkerLie,
    state.hazards,
    state.lieQuality,
    state.slope,
    state.surface,
    state.temperature,
    state.windDirection,
    state.windStrength,
    wedgeMatrixSources,
  ]);

  const isWedgeMatrixChip = Boolean(isChipping && baseRecommendation?.wedgeMatrixRecommendation);
  const clubChoice = useMemo(() => {
    if (isPutting) {
      return { club: 'Putter', carry: 0 };
    }

    if (state.selectedClub) {
      const selectedMatch = carryBook.find((entry) => entry.club === state.selectedClub);
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

      return { club: 'Chip shot', carry: Math.max(0, state.distanceToMiddleMeters) };
    }

    if (!baseRecommendation) {
      return { club: 'Club', carry: 0 };
    }

    if (baseRecommendation.wedgeMatrixRecommendation) {
      return {
        club: baseRecommendation.wedgeMatrixRecommendation.club,
        carry: baseRecommendation.wedgeMatrixRecommendation.distanceMeters,
      };
    }

    const matched = carryBook.find((entry) => entry.club === baseRecommendation.recommendedClub);
    return matched ?? carryBook[carryBook.length - 1] ?? { club: baseRecommendation.recommendedClub, carry: 0 };
  }, [baseRecommendation, carryBook, isChipping, isPutting, state.distanceToMiddleMeters, state.selectedClub]);

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
    if (state.showAllOverrideClubs) {
      return displayedCarryBook;
    }

    const recommendedIndex = displayedCarryBook.findIndex((entry) => entry.club === overrideRecommendedClub);
    if (recommendedIndex === -1) {
      return displayedCarryBook.slice(0, 7);
    }

    const startIndex = Math.max(0, recommendedIndex - 3);
    const endIndex = Math.min(displayedCarryBook.length, recommendedIndex + 4);
    return displayedCarryBook.slice(startIndex, endIndex);
  }, [displayedCarryBook, overrideRecommendedClub, state.showAllOverrideClubs]);

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
    const shot = state.trail[index];
    const showAdvancedValue =
      (shot.actionType !== 'putting' && shot.surface !== 'fairway') ||
      shot.lieQuality !== 'good' ||
      shot.slope !== 'flat' ||
      (shot.surface === 'bunker' && shot.bunkerLie !== 'clean') ||
      shot.temperature !== 'normal' ||
      shot.windDirection !== 'none' ||
      shot.windStrength !== 'calm' ||
      shot.hazards.length > 0;
    dispatch({
      type: 'startEdit',
      payload: {
        index,
        shot,
        showAdvanced: showAdvancedValue,
        snapshot: {
          baseHoleStats: state.baseHoleStats,
          trail: state.trail,
          draft: buildPersistedDraftFromState(state),
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
      state.outcomeSelection === 'girHit' || state.outcomeSelection === 'girHoled' || state.outcomeSelection === 'puttHoled'
        ? 0
        : state.distanceMode === 'point'
          ? Math.max(0, state.distanceToHoleMeters - state.distanceToMiddleMeters)
          : Math.max(0, state.distanceToHoleMeters - Math.max(0, recommendation.carryMeters));
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

    if (state.editingSnapshot && state.editingIndex != null && onDeleteClubActualEntry) {
      const staleShots = state.editingSnapshot.trail.slice(state.editingIndex);
      for (const staleShot of staleShots) {
        if (typeof staleShot.clubActualEntryId === 'number' && staleShot.clubActualEntryId > 0) {
          await onDeleteClubActualEntry(staleShot.clubActualEntryId);
        }
      }
    }

    const actualDistanceMeters =
      state.distanceMode === 'point' && state.actionType !== 'putting' && state.actionType !== 'chipping'
        ? Math.max(0, Math.min(state.distanceToHoleMeters, state.distanceToMiddleMeters))
        : getActualDistanceFromStart(state.distanceToHoleMeters, remainingDistanceMeters);
    let clubActualEntryId: number | null = null;
    if (
      onSaveClubActual &&
      shouldTrackClubActual({
        actionType: state.actionType,
        surface: state.surface,
        club: recommendation.club,
      } as Pick<PlannerShot, 'actionType' | 'surface' | 'club'>) &&
      actualDistanceMeters > 0
    ) {
      clubActualEntryId = await onSaveClubActual({
        club: recommendation.club,
        actualMeters: actualDistanceMeters,
      });
    }

    const nextShot: PlannerShot = {
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
      puttCount: state.puttCount,
      penaltyStrokes: state.penaltyStrokes,
      puttMissLong: state.puttMissLong,
      puttMissShort: state.puttMissShort,
      puttMissWithin2m: state.puttMissWithin2m,
      clubActualEntryId,
      scoreDelta: (state.actionType === 'putting' ? Math.max(1, state.puttCount ?? 1) : 1) + state.penaltyStrokes,
      oopResult: deriveOopResult(state.actionType, state.surface, state.oopResult),
      shotCategory: deriveShotCategory(state.actionType, state.surface, state.distanceToMiddleMeters, recommendation.club),
      inside100Over3: 0,
      outcomeSelection: state.outcomeSelection as VirtualCaddyOutcomeSelection,
    };

    const nextTrail = [...state.trail, nextShot];
    const nextSurface = nextActionType === 'putting' ? 'fairway' : getSurfaceFromOutcome(state.outcomeSelection);
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
      getTrailRecordedDistanceMeters(state.trail, shot, index, state.distanceToHoleMeters, isHoleComplete),
    getTrailSummary,
    actions: {
      dispatch,
      saveShot,
      startEdit,
      cancelEdit,
      onHoleComplete,
    },
  };
}
