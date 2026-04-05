import { describe, expect, it } from 'vitest';

import { emptyHoleStats } from '../../../lib/rounds';
import { createInitialVirtualCaddyState, virtualCaddyReducer } from './reducer';

describe('virtual caddy reducer', () => {
  it('hydrates and updates draft fields through reducer actions', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');
    const updated = virtualCaddyReducer(initial, { type: 'patchDraft', payload: { showAdvanced: true, windDirection: 'into' } });

    expect(updated.showAdvanced).toBe(true);
    expect(updated.windDirection).toBe('into');
  });

  it('toggles hazards and keeps them unique', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');
    const withHazard = virtualCaddyReducer(initial, { type: 'toggleHazard', payload: 'left' });
    const withoutHazard = virtualCaddyReducer(withHazard, { type: 'toggleHazard', payload: 'left' });

    expect(withHazard.hazards).toEqual(['left']);
    expect(withoutHazard.hazards).toEqual([]);
  });

  it('switches point and hole distance modes consistently', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');
    const pointMode = virtualCaddyReducer(initial, { type: 'setDistanceMode', payload: 'point' });
    const moved = virtualCaddyReducer(pointMode, { type: 'setHoleDistance', payload: 180 });

    expect(pointMode.distanceMode).toBe('point');
    expect(moved.distanceToHoleMeters).toBe(180);
    expect(moved.distanceToMiddleMeters).toBeLessThanOrEqual(180);
  });

  it('initializes and clears previous-shot distance adjustment outside on-green outcomes', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');

    expect(initial.previousShotDistanceAdjustmentMeters).toBe(0);

    const updated = virtualCaddyReducer(initial, { type: 'patchDraft', payload: { previousShotDistanceAdjustmentMeters: 6 } });
    const cleared = virtualCaddyReducer(updated, { type: 'setOutcomeSelection', payload: 'fairwayHit' });

    expect(updated.previousShotDistanceAdjustmentMeters).toBe(6);
    expect(cleared.previousShotDistanceAdjustmentMeters).toBe(0);
  });

  it('preserves chip-step flag adjustment state while selecting chip results', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 20, 'fairway');
    const chipping = virtualCaddyReducer(initial, {
      type: 'patchDraft',
      payload: {
        actionType: 'chipping',
        previousShotDistanceAdjustmentMeters: 4,
        previousShotUseFlagAdjustment: true,
      },
    });
    const updated = virtualCaddyReducer(chipping, { type: 'setOutcomeSelection', payload: 'chipOnGreen' });

    expect(updated.previousShotDistanceAdjustmentMeters).toBe(4);
    expect(updated.previousShotUseFlagAdjustment).toBe(true);
  });
});
