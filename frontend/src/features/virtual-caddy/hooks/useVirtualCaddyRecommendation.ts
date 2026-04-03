import { useMemo } from 'react';

import type { WedgeMatrixSource } from '../../../lib/wedgeMatrix';
import {
  getCarryBook,
  getLongestClubCarry,
  getVirtualCaddyRecommendation,
} from '../../../lib/virtualCaddy';
import type { VirtualCaddyState } from '../types';

type RecommendationArgs = {
  state: VirtualCaddyState;
  carryByClub?: Record<string, number>;
  wedgeMatrices: Array<{ id: number }>;
  wedgeEntriesByMatrix: Record<number, unknown[]>;
};

export function useVirtualCaddyRecommendation({
  state,
  carryByClub,
  wedgeMatrices,
  wedgeEntriesByMatrix,
}: RecommendationArgs) {
  const recommendationDistanceMeters = state.distanceMode === 'point' ? state.distanceToMiddleMeters : state.distanceToHoleMeters;
  const carryBook = useMemo(() => getCarryBook(carryByClub), [carryByClub]);
  const wedgeMatrixSources = useMemo<WedgeMatrixSource[]>(
    () =>
      wedgeMatrices.map((matrix) => ({
        matrix: matrix as WedgeMatrixSource['matrix'],
        entries: (wedgeEntriesByMatrix[matrix.id] ?? []) as WedgeMatrixSource['entries'],
      })),
    [wedgeEntriesByMatrix, wedgeMatrices],
  );
  const longestCarry = useMemo(() => getLongestClubCarry(carryByClub), [carryByClub]);

  const baseRecommendation = useMemo(() => {
    if (state.actionType === 'putting') {
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
    recommendationDistanceMeters,
    state.actionType,
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

  const isChipping = state.actionType === 'chipping';
  const isPutting = state.actionType === 'putting';
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

  const recommendation = useMemo(
    () => ({
      club: clubChoice.club,
      carryMeters: clubChoice.carry,
      effectiveDistanceMeters: baseRecommendation?.details.effectiveDistanceMeters ?? 0,
      reasons: baseRecommendation?.reasons ?? [],
      source: baseRecommendation?.source ?? 'carryBook',
      wedgeMatrixId: baseRecommendation?.wedgeMatrixId ?? null,
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
    }),
    [baseRecommendation, clubChoice.carry, clubChoice.club, isChipping, isPutting, isWedgeMatrixChip, recommendationDistanceMeters],
  );

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

  return {
    baseRecommendation,
    recommendation,
    carryBook,
    displayedCarryBook,
    visibleOverrideClubs,
    longestCarry,
    wedgeMatrixSources,
    isWedgeMatrixChip,
  };
}
