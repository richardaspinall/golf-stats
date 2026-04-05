import { describe, expect, it } from 'vitest';

import { emptyHoleStats } from '../../../lib/rounds';
import { buildHydratedState, buildPersistedDraftFromState, sanitizePersistedState, stripVirtualCaddyState } from './persistence';
import { createInitialVirtualCaddyState } from '../state/reducer';

describe('virtual caddy persistence adapters', () => {
  it('strips persisted virtual caddy state from base hole stats', () => {
    const stripped = stripVirtualCaddyState({
      ...emptyHoleStats(),
      manualScoreEnteredOnTrack: 1 as never,
      virtualCaddyState: { version: 1, baseHoleStats: emptyHoleStats(), trail: [], draft: {} },
    });

    expect(stripped.virtualCaddyState).toBeNull();
    expect(stripped.manualScoreEnteredOnTrack).toBe(true);
  });

  it('accepts only version 1 persisted state payloads', () => {
    expect(sanitizePersistedState({ version: 1, baseHoleStats: {}, trail: [], draft: {} })).not.toBeNull();
    expect(sanitizePersistedState({ version: 2 })).toBeNull();
  });

  it('hydrates reducer state from persisted draft data', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');
    const persistedDraft = buildPersistedDraftFromState({ ...initial, distanceToHoleMeters: 180, showAdvanced: true });
    const holeStats = {
      ...emptyHoleStats(),
      virtualCaddyState: {
        version: 1 as const,
        baseHoleStats: emptyHoleStats(),
        trail: [],
        draft: persistedDraft,
      },
    };

    const hydrated = buildHydratedState(holeStats, 150, createInitialVirtualCaddyState);

    expect(hydrated.distanceToHoleMeters).toBe(180);
    expect(hydrated.showAdvanced).toBe(true);
  });

  it('treats zero first putt distance as unset so the default can show', () => {
    const initial = createInitialVirtualCaddyState(emptyHoleStats(), 150, 'tee');
    const persistedDraft = buildPersistedDraftFromState({ ...initial, actionType: 'putting', firstPuttDistanceMeters: 0 });
    const holeStats = {
      ...emptyHoleStats(),
      virtualCaddyState: {
        version: 1 as const,
        baseHoleStats: emptyHoleStats(),
        trail: [],
        draft: persistedDraft,
      },
    };

    const hydrated = buildHydratedState(holeStats, 150, createInitialVirtualCaddyState);

    expect(hydrated.firstPuttDistanceMeters).toBeNull();
  });
});
