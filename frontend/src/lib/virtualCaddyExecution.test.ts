import { describe, expect, it } from 'vitest';

import { buildInitialByHole } from './rounds';
import { applyVirtualCaddyExecution, applyVirtualCaddyTrailToHole } from './virtualCaddyExecution';

describe('applyVirtualCaddyExecution', () => {
  it('increments score and selected outcome counters on the active hole', () => {
    const initial = buildInitialByHole();

    const updated = applyVirtualCaddyExecution(initial, {
      hole: 3,
      scoreDelta: 1,
      oopResult: 'look',
      shotCategory: 'chip',
      inside100Over3: 2,
      puttCount: null,
    });

    expect(updated[3].score).toBe(1);
    expect(updated[3].oopLook).toBe(1);
    expect(updated[3].oopNoLook).toBe(0);
    expect(updated[3].inside100ChipShots).toBe(1);
    expect(updated[3].inside100Over3).toBe(2);
  });

  it('leaves unrelated counters untouched and supports bunker/no-look outcomes', () => {
    const initial = buildInitialByHole();

    const updated = applyVirtualCaddyExecution(initial, {
      hole: 7,
      scoreDelta: 2,
      oopResult: 'noLook',
      shotCategory: 'bunker',
      inside100Over3: 0,
      puttCount: 2,
    });

    expect(updated[7].score).toBe(2);
    expect(updated[7].totalPutts).toBe(2);
    expect(updated[7].oopNoLook).toBe(1);
    expect(updated[7].inside100Bunkers).toBe(1);
    expect(updated[7].inside100Over3).toBe(0);
    expect(updated[6].score).toBe(0);
  });

  it('tracks the running overage for shots taken inside 100m', () => {
    const holeStats = buildInitialByHole()[4];

    const updated = applyVirtualCaddyTrailToHole(holeStats, [
      { hole: 4, scoreDelta: 1, oopResult: 'none', shotCategory: 'wedge', inside100Over3: 0, distanceStartMeters: 90, outcomeSelection: null },
      { hole: 4, scoreDelta: 1, oopResult: 'none', shotCategory: 'wedge', inside100Over3: 0, distanceStartMeters: 70, outcomeSelection: null },
      { hole: 4, scoreDelta: 1, oopResult: 'none', shotCategory: 'wedge', inside100Over3: 0, distanceStartMeters: 50, outcomeSelection: null },
      { hole: 4, scoreDelta: 1, oopResult: 'none', shotCategory: 'chip', inside100Over3: 0, distanceStartMeters: 25, outcomeSelection: null },
      { hole: 4, scoreDelta: 1, oopResult: 'none', shotCategory: 'chip', inside100Over3: 0, distanceStartMeters: 12, outcomeSelection: null },
      { hole: 4, scoreDelta: 2, oopResult: 'none', shotCategory: 'chip', inside100Over3: 0, distanceStartMeters: 6, outcomeSelection: 'puttHoled', puttCount: 2 },
    ]);

    expect(updated.inside100Over3).toBe(4);
  });

  it('only uses the first shot for the hole fairway result', () => {
    const holeStats = buildInitialByHole()[5];

    const updated = applyVirtualCaddyTrailToHole(holeStats, [
      { hole: 5, scoreDelta: 1, oopResult: 'none', shotCategory: 'none', inside100Over3: 0, distanceStartMeters: 380, outcomeSelection: 'fairwayLeft' },
      { hole: 5, scoreDelta: 1, oopResult: 'none', shotCategory: 'none', inside100Over3: 0, distanceStartMeters: 170, outcomeSelection: 'fairwayHit' },
    ]);

    expect(updated.fairwaySelection).toBe('fairwayLeft');
  });

  it('only uses the first shot at the green for the hole GIR result', () => {
    const holeStats = buildInitialByHole()[6];

    const updated = applyVirtualCaddyTrailToHole(holeStats, [
      { hole: 6, scoreDelta: 1, oopResult: 'none', shotCategory: 'none', inside100Over3: 0, distanceStartMeters: 175, outcomeSelection: 'fairwayHit' },
      { hole: 6, scoreDelta: 1, oopResult: 'none', shotCategory: 'wedge', inside100Over3: 0, distanceStartMeters: 82, outcomeSelection: 'girRight' },
      { hole: 6, scoreDelta: 1, oopResult: 'none', shotCategory: 'chip', inside100Over3: 0, distanceStartMeters: 12, outcomeSelection: 'girHit' },
    ]);

    expect(updated.girSelection).toBe('girRight');
  });

  it('counts an up and down when the first green hit is a chip and the player one-putts', () => {
    const holeStats = buildInitialByHole()[8];

    const updated = applyVirtualCaddyTrailToHole(holeStats, [
      { hole: 8, scoreDelta: 1, oopResult: 'none', shotCategory: 'none', inside100Over3: 0, distanceStartMeters: 340, outcomeSelection: 'fairwayRight' },
      { hole: 8, scoreDelta: 1, oopResult: 'none', shotCategory: 'chip', inside100Over3: 0, distanceStartMeters: 14, outcomeSelection: 'chipOnGreen' },
      { hole: 8, scoreDelta: 1, oopResult: 'none', shotCategory: 'none', inside100Over3: 0, distanceStartMeters: 3, outcomeSelection: 'puttHoled', puttCount: 1 },
    ]);

    expect(updated.upAndDown).toBe(1);
  });
});
