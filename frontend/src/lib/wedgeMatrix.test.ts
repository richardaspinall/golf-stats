import { describe, expect, it } from 'vitest';

import { buildWedgeMatrixRows, getClosestWedgeMatrixRecommendation } from './wedgeMatrix';

describe('wedge matrix free-form values', () => {
  it('displays saved values without treating them as distances', () => {
    const rows = buildWedgeMatrixRows([], ['56w'], ['9:00'], 'freeform', {
      '56w': { '9:00': 'Low' },
    });

    expect(rows[0].cells[0]).toMatchObject({ avgMeters: null, count: 0, displayValue: 'Low' });
    expect(getClosestWedgeMatrixRecommendation([], ['56w'], ['9:00'], 40, 'freeform', { '56w': { '9:00': 'Low' } })).toBeNull();
  });
});
