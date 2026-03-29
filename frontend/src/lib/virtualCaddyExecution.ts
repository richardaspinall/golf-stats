import type { StatsByHole } from '../types';

export type VirtualCaddyExecution = {
  hole: number;
  scoreDelta: number;
  oopResult: 'none' | 'look' | 'noLook';
  shotCategory: 'none' | 'wedge' | 'chip' | 'bunker';
  inside100Over3: boolean;
};

export const applyVirtualCaddyExecution = (
  statsByHole: StatsByHole,
  { hole, scoreDelta, oopResult, shotCategory, inside100Over3 }: VirtualCaddyExecution,
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
      oopLook: Number(currentHole.oopLook || 0) + (oopResult === 'look' ? 1 : 0),
      oopNoLook: Number(currentHole.oopNoLook || 0) + (oopResult === 'noLook' ? 1 : 0),
      inside100Wedges: Number(currentHole.inside100Wedges || 0) + (shotCategory === 'wedge' ? 1 : 0),
      inside100ChipShots: Number(currentHole.inside100ChipShots || 0) + (shotCategory === 'chip' ? 1 : 0),
      inside100Bunkers: Number(currentHole.inside100Bunkers || 0) + (shotCategory === 'bunker' ? 1 : 0),
      inside100Over3: Number(currentHole.inside100Over3 || 0) + (inside100Over3 ? 1 : 0),
    },
  };
};
