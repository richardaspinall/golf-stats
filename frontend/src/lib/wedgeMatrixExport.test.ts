import { describe, expect, it } from 'vitest';

import type { WedgeEntry, WedgeMatrix } from '../types';
import { buildAllWedgeMatricesExportCsv, buildAllWedgeMatricesExportFilename } from './wedgeMatrixExport';

const matrix = (overrides: Partial<WedgeMatrix>): WedgeMatrix => ({
  id: 1,
  name: 'Stock wedges',
  groupName: 'Scoring',
  sortOrder: 0,
  stanceWidth: 'Narrow',
  grip: 'Choked down',
  ballPosition: 'Middle',
  flightAndLanding: 'High and stop quickly',
  notes: '',
  currentRoundAdjustments: '',
  clubs: ['56w'],
  swingClocks: ['9:00'],
  calculationMode: 'entries',
  setValues: {},
  createdAt: '2026-09-09T00:00:00Z',
  ...overrides,
});

describe('wedge matrix CSV export', () => {
  it('exports every matrix mode and its full grid', () => {
    const matrices = [
      matrix({ notes: 'Firm, dry', currentRoundAdjustments: 'Take "two" off' }),
      matrix({ id: 2, name: 'Stock values', calculationMode: 'setValues', setValues: { '56w': { '9:00': 80 } } }),
      matrix({ id: 3, name: 'Feel shots', calculationMode: 'freeform', setValues: { '56w': { '9:00': 'Low\nrunner' } } }),
    ];
    const entries: WedgeEntry[] = [
      { id: 1, matrixId: 1, club: '56w', swingClock: '9:00', distanceMeters: 78, createdAt: '' },
      { id: 2, matrixId: 1, club: '56w', swingClock: '9:00', distanceMeters: 82, createdAt: '' },
    ];

    const csv = buildAllWedgeMatricesExportCsv(matrices, { 1: entries });
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'Group,Matrix,Calculation mode,Stance width,Grip,Ball position,Ball flight / landing,Notes,Round adjustments,Club,Swing,Value,Distance meters,Shot count',
    );
    expect(csv).toContain('Scoring,Stock wedges,entries,Narrow,Choked down,Middle,High and stop quickly,"Firm, dry","Take ""two"" off",56w,9:00,80m,80,2');
    expect(csv).toContain('Scoring,Stock values,setValues,Narrow,Choked down,Middle,High and stop quickly,,,56w,9:00,80m,80,0');
    expect(csv).toContain('Scoring,Feel shots,freeform,Narrow,Choked down,Middle,High and stop quickly,,,56w,9:00,"Low\nrunner",,0');
  });

  it('exports headers for an empty collection and uses a stable filename', () => {
    expect(buildAllWedgeMatricesExportCsv([], {})).toBe(
      'Group,Matrix,Calculation mode,Stance width,Grip,Ball position,Ball flight / landing,Notes,Round adjustments,Club,Swing,Value,Distance meters,Shot count',
    );
    expect(buildAllWedgeMatricesExportFilename()).toBe('all-matrixes-export.csv');
  });
});
