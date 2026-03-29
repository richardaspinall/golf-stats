import { describe, expect, it } from 'vitest';

import { buildInitialByHole } from './rounds';
import { applyVirtualCaddyExecution } from './virtualCaddyExecution';

describe('applyVirtualCaddyExecution', () => {
  it('increments score and selected outcome counters on the active hole', () => {
    const initial = buildInitialByHole();

    const updated = applyVirtualCaddyExecution(initial, {
      hole: 3,
      scoreDelta: 1,
      oopResult: 'look',
      shotCategory: 'chip',
      inside100Over3: true,
    });

    expect(updated[3].score).toBe(1);
    expect(updated[3].oopLook).toBe(1);
    expect(updated[3].oopNoLook).toBe(0);
    expect(updated[3].inside100ChipShots).toBe(1);
    expect(updated[3].inside100Over3).toBe(1);
  });

  it('leaves unrelated counters untouched and supports bunker/no-look outcomes', () => {
    const initial = buildInitialByHole();

    const updated = applyVirtualCaddyExecution(initial, {
      hole: 7,
      scoreDelta: 2,
      oopResult: 'noLook',
      shotCategory: 'bunker',
      inside100Over3: false,
    });

    expect(updated[7].score).toBe(2);
    expect(updated[7].oopNoLook).toBe(1);
    expect(updated[7].inside100Bunkers).toBe(1);
    expect(updated[7].inside100Over3).toBe(0);
    expect(updated[6].score).toBe(0);
  });
});
