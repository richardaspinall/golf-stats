import { describe, expect, it } from 'vitest';

import { getVirtualCaddyRecommendation } from './virtualCaddy';

describe('getVirtualCaddyRecommendation', () => {
  it('recommends a club from distance alone', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
    });

    expect(recommendation.recommendedClub).toBe('6i');
    expect(recommendation.adjustedDistanceMeters).toBe(150);
    expect(recommendation.aimBias).toBe('center');
  });

  it('keeps a neutral line when bunkers guard both sides', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
      surface: 'fairway',
      lieQuality: 'good',
      slope: 'flat',
      temperature: 'normal',
      windDirection: 'none',
      hazards: ['left', 'right'],
    });

    expect(recommendation.recommendedClub).toBe('6i');
    expect(recommendation.aimBias).toBe('center');
    expect(recommendation.reasons).toContain('Two-sided trouble: favor the most neutral start line.');
  });

  it('adds context adjustments and a safer target line for rough and uphill lies', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
      surface: 'rough',
      lieQuality: 'good',
      slope: 'uphill',
      temperature: 'normal',
      windDirection: 'none',
      hazards: ['left'],
    });

    expect(recommendation.adjustedDistanceMeters).toBe(164);
    expect(recommendation.recommendedClub).toBe('4i');
    expect(recommendation.aimBias).toBe('rightCenter');
    expect(recommendation.reasons).toContain('Surface: rough +8m');
    expect(recommendation.reasons).toContain('Slope: uphill +6m');
    expect(recommendation.reasons).toContain('Left-side trouble: bias the target slightly right of center.');
  });
});
