import type { HoleStats, StatsByHole } from '../types';

export type VirtualCaddyExecution = {
  hole: number;
  scoreDelta: number;
  oopResult: 'none' | 'look' | 'noLook';
  shotCategory: 'none' | 'wedge' | 'chip' | 'bunker';
  inside100Over3: number;
  puttMissLong?: number;
  puttMissShort?: number;
  puttMissWithin2m?: number;
};

export type VirtualCaddyOutcomeSelection =
  | 'fairwayHit'
  | 'fairwayLeft'
  | 'fairwayRight'
  | 'fairwayShort'
  | 'fairwayLong'
  | 'girHit'
  | 'girLeft'
  | 'girRight'
  | 'girShort'
  | 'girLong'
  | 'chipOnGreen'
  | 'chipMissGreen'
  | 'puttHoled';

export type VirtualCaddyExecutedShot = VirtualCaddyExecution & {
  outcomeSelection: VirtualCaddyOutcomeSelection | null;
  puttCount?: number | null;
};

type TrailExecution = VirtualCaddyExecutedShot & {
  distanceStartMeters?: number;
};

export const applyVirtualCaddyExecution = (
  statsByHole: StatsByHole,
  { hole, scoreDelta, oopResult, shotCategory, inside100Over3, puttCount, puttMissLong, puttMissShort, puttMissWithin2m }: VirtualCaddyExecution & { puttCount?: number | null },
): StatsByHole => {
  const currentHole = statsByHole[hole];
  if (!currentHole) {
    return statsByHole;
  }

  return {
    ...statsByHole,
    [hole]: {
      ...currentHole,
      score: Math.max(0, Number(currentHole.score || 0) + Math.max(0, Math.floor(scoreDelta))),
      totalPutts: Number(currentHole.totalPutts || 0) + (typeof puttCount === 'number' && puttCount > 0 ? puttCount : 0),
      oopLook: Number(currentHole.oopLook || 0) + (oopResult === 'look' ? 1 : 0),
      oopNoLook: Number(currentHole.oopNoLook || 0) + (oopResult === 'noLook' ? 1 : 0),
      inside100Wedges: Number(currentHole.inside100Wedges || 0) + (shotCategory === 'wedge' ? 1 : 0),
      inside100ChipShots: Number(currentHole.inside100ChipShots || 0) + (shotCategory === 'chip' ? 1 : 0),
      inside100Bunkers: Number(currentHole.inside100Bunkers || 0) + (shotCategory === 'bunker' ? 1 : 0),
      inside100Over3: Number(currentHole.inside100Over3 || 0) + Math.max(0, Math.floor(inside100Over3 || 0)),
      puttMissLong: Number(currentHole.puttMissLong || 0) + Math.max(0, Math.floor(puttMissLong || 0)),
      puttMissShort: Number(currentHole.puttMissShort || 0) + Math.max(0, Math.floor(puttMissShort || 0)),
      puttMissWithin2m: Number(currentHole.puttMissWithin2m || 0) + Math.max(0, Math.floor(puttMissWithin2m || 0)),
    },
  };
};

export const applyVirtualCaddyTrailToHole = (baseHoleStats: HoleStats, executions: TrailExecution[]): HoleStats => {
  const nextHoleStats: HoleStats = { ...baseHoleStats };

  nextHoleStats.score = Number(baseHoleStats.score || 0);
  nextHoleStats.totalPutts = Number(baseHoleStats.totalPutts || 0);
  nextHoleStats.oopLook = Number(baseHoleStats.oopLook || 0);
  nextHoleStats.oopNoLook = Number(baseHoleStats.oopNoLook || 0);
  nextHoleStats.inside100Wedges = Number(baseHoleStats.inside100Wedges || 0);
  nextHoleStats.inside100ChipShots = Number(baseHoleStats.inside100ChipShots || 0);
  nextHoleStats.inside100Bunkers = Number(baseHoleStats.inside100Bunkers || 0);
  nextHoleStats.inside100Over3 = Number(baseHoleStats.inside100Over3 || 0);
  nextHoleStats.puttMissLong = Number(baseHoleStats.puttMissLong || 0);
  nextHoleStats.puttMissShort = Number(baseHoleStats.puttMissShort || 0);
  nextHoleStats.puttMissWithin2m = Number(baseHoleStats.puttMissWithin2m || 0);
  nextHoleStats.fairwaySelection = baseHoleStats.fairwaySelection;
  nextHoleStats.girSelection = baseHoleStats.girSelection;

  let inside100Shots = 0;

  executions.forEach((execution) => {
    nextHoleStats.score = Math.max(0, Number(nextHoleStats.score || 0) + Math.max(0, Math.floor(execution.scoreDelta || 0)));
    if (typeof execution.puttCount === 'number' && execution.puttCount > 0) {
      nextHoleStats.totalPutts = Number(nextHoleStats.totalPutts || 0) + execution.puttCount;
    }
    if (execution.oopResult === 'look') {
      nextHoleStats.oopLook = Number(nextHoleStats.oopLook || 0) + 1;
    }
    if (execution.oopResult === 'noLook') {
      nextHoleStats.oopNoLook = Number(nextHoleStats.oopNoLook || 0) + 1;
    }
    if (execution.shotCategory === 'wedge') {
      nextHoleStats.inside100Wedges = Number(nextHoleStats.inside100Wedges || 0) + 1;
    }
    if (execution.shotCategory === 'chip') {
      nextHoleStats.inside100ChipShots = Number(nextHoleStats.inside100ChipShots || 0) + 1;
    }
    if (execution.shotCategory === 'bunker') {
      nextHoleStats.inside100Bunkers = Number(nextHoleStats.inside100Bunkers || 0) + 1;
    }
    nextHoleStats.puttMissLong = Number(nextHoleStats.puttMissLong || 0) + Math.max(0, Math.floor(execution.puttMissLong || 0));
    nextHoleStats.puttMissShort = Number(nextHoleStats.puttMissShort || 0) + Math.max(0, Math.floor(execution.puttMissShort || 0));
    nextHoleStats.puttMissWithin2m =
      Number(nextHoleStats.puttMissWithin2m || 0) + Math.max(0, Math.floor(execution.puttMissWithin2m || 0));
    if (typeof execution.distanceStartMeters === 'number' && execution.distanceStartMeters <= 100) {
      inside100Shots += Math.max(0, Math.floor(execution.scoreDelta || 0));
    }
    if (execution.outcomeSelection?.startsWith('fairway')) {
      nextHoleStats.fairwaySelection = execution.outcomeSelection;
    }
    if (execution.outcomeSelection?.startsWith('gir')) {
      nextHoleStats.girSelection = execution.outcomeSelection;
    }
  });

  nextHoleStats.inside100Over3 = Math.max(0, inside100Shots - 3);

  return nextHoleStats;
};
