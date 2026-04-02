import { describe, expect, it } from 'vitest';

import {
  clampDistanceMeters,
  deriveOopResult,
  deriveShotCategory,
  formatOutcomeLabel,
  getScoreSummaryStyle,
  getSurfaceFromOutcome,
  summarizeCompletedHole,
} from './planner';

describe('virtual caddy planner helpers', () => {
  it('maps outcomes back to the next surface', () => {
    expect(getSurfaceFromOutcome('fairwayLeft')).toBe('rough');
    expect(getSurfaceFromOutcome('chipOnGreen')).toBe('fairway');
  });

  it('clamps shot distances into the supported range', () => {
    expect(clampDistanceMeters(-10)).toBe(0);
    expect(clampDistanceMeters(999)).toBe(600);
  });

  it('derives OOP only for non-fairway non-putting shots', () => {
    expect(deriveOopResult('shot', 'rough', 'look')).toBe('look');
    expect(deriveOopResult('putting', 'rough', 'look')).toBe('none');
  });

  it('derives the inside-100 shot category from action, surface, and club', () => {
    expect(deriveShotCategory('shot', 'fairway', 90, '56w')).toBe('wedge');
    expect(deriveShotCategory('chipping', 'bunker', 20, '56w')).toBe('bunker');
  });

  it('formats outcomes and completion score summaries', () => {
    expect(formatOutcomeLabel('girHoled')).toBe('Holed');
    expect(
      summarizeCompletedHole(
        [
          { actionType: 'tee', penaltyStrokes: 0, puttCount: null },
          { actionType: 'putting', penaltyStrokes: 0, puttCount: 2 },
        ] as never,
        4,
      ),
    ).toEqual({ par: 4, score: 3, putts: 2 });
    expect(getScoreSummaryStyle(4, 3).tone).toBe('birdie');
  });
});
