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

    expect(recommendation.adjustedDistanceMeters).toBe(165);
    expect(recommendation.recommendedClub).toBe('4i');
    expect(recommendation.aimBias).toBe('rightCenter');
    expect(recommendation.reasons).toContain('Surface: rough +7m');
    expect(recommendation.reasons).toContain('Slope: uphill +8m');
    expect(recommendation.reasons).toContain('Left-side trouble: bias the target slightly right of center.');
    expect(recommendation.reasons).toContain('Uphill lie can turn the ball over left, so favor a start line slightly right.');
  });

  it('biases left-center and takes less club on downhill lies', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
      slope: 'downhill',
      lieQuality: 'good',
      temperature: 'normal',
      windDirection: 'none',
    });

    expect(recommendation.adjustedDistanceMeters).toBe(144);
    expect(recommendation.recommendedClub).toBe('6i');
    expect(recommendation.aimBias).toBe('leftCenter');
    expect(recommendation.reasons).toContain('Slope: downhill -6m');
    expect(recommendation.reasons).toContain('Downhill lie tends to leak right, so favor a start line slightly left.');
  });

  it('adds bunker-specific lie adjustments and tips for buried lies', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 80,
      surface: 'bunker',
      bunkerLie: 'buried',
      lieQuality: 'good',
      slope: 'flat',
      temperature: 'normal',
      windDirection: 'none',
    });

    expect(recommendation.adjustedDistanceMeters).toBe(100);
    expect(recommendation.recommendedClub).toBe('PW');
    expect(recommendation.reasons).toContain('Surface: bunker +12m');
    expect(recommendation.reasons).toContain('Bunker lie: buried +8m');
    expect(recommendation.reasons).toContain('Buried lie: expect less spin and rollout control, so take more loft and play for the safe side.');
  });

  it('adds more club when missing short is bad on an approach shot', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
      surface: 'fairway',
      lieQuality: 'good',
      slope: 'flat',
      windDirection: 'none',
      hazards: ['short'],
    });

    expect(recommendation.adjustedDistanceMeters).toBe(156);
    expect(recommendation.recommendedClub).toBe('5i');
    expect(recommendation.reasons).toContain('Miss short is bad +6m');
    expect(recommendation.reasons).toContain('Missing short leaves a tougher recovery, so favor enough carry.');
  });

  it('takes less club when long is bad on an approach shot', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 150,
      surface: 'fairway',
      lieQuality: 'good',
      slope: 'flat',
      windDirection: 'none',
      hazards: ['long'],
    });

    expect(recommendation.adjustedDistanceMeters).toBe(144);
    expect(recommendation.recommendedClub).toBe('6i');
    expect(recommendation.reasons).toContain('Miss long is bad -6m');
    expect(recommendation.reasons).toContain('Going long brings trouble in, so favor the number that stays short of it.');
  });

  it('does not apply short or long hazard distance adjustments on tee shots', () => {
    const recommendation = getVirtualCaddyRecommendation({
      distanceToMiddleMeters: 180,
      surface: 'tee',
      lieQuality: 'good',
      slope: 'flat',
      windDirection: 'none',
      hazards: ['short', 'long'],
    });

    expect(recommendation.adjustedDistanceMeters).toBe(180);
    expect(recommendation.recommendedClub).toBe('5Hy');
    expect(recommendation.reasons).not.toContain('Miss short is bad +6m');
    expect(recommendation.reasons).not.toContain('Miss long is bad -6m');
  });
});
