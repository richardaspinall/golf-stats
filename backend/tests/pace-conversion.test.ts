import { describe, expect, it } from 'vitest';

import { metersToPaces, pacesToMeters } from '../../frontend/src/lib/geometry.ts';

describe('pace conversion', () => {
  it('converts 1 pace to 0.77 meters with app rounding', () => {
    expect(pacesToMeters(1)).toBe(1);
  });

  it('uses the 0.77 meters-per-pace ratio for larger values', () => {
    expect(pacesToMeters(10)).toBe(8);
    expect(pacesToMeters(100)).toBe(77);
  });

  it('converts meters back to paces using the same ratio', () => {
    expect(metersToPaces(1)).toBe(1);
    expect(metersToPaces(77)).toBe(100);
    expect(metersToPaces(154)).toBe(200);
  });
});
