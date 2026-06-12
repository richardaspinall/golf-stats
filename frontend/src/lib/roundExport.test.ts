import { describe, expect, it } from 'vitest';

import { buildInitialByHole, buildInitialCourseMarkers, computeCompletedHolesPar, computeTotalsForStats } from './rounds';
import { buildAllRoundsExportCsv, buildAllRoundsExportFilename, buildRoundExportCsv, buildRoundExportFilename } from './roundExport';

describe('round export helpers', () => {
  it('builds a single-row CSV export with prefixed stat headers', () => {
    const statsByHole = buildInitialByHole();
    const courseMarkers = buildInitialCourseMarkers();

    courseMarkers[1].par = 4;
    courseMarkers[1].holeIndex = 7;
    courseMarkers[1].distanceMeters = 351;
    statsByHole[1].score = 5;
    statsByHole[1].fairwaySelection = 'fairwayHit';
    statsByHole[1].girSelection = 'girShort';
    statsByHole[1].totalPutts = 2;
    statsByHole[1].penalties = 1;

    const totals = computeTotalsForStats(statsByHole, courseMarkers, 12);
    const completedHolesPar = computeCompletedHolesPar(statsByHole, courseMarkers);

    const csv = buildRoundExportCsv({
      roundName: 'Saturday Medal',
      roundDate: '2026-06-12',
      courseName: 'Royal Park',
      handicap: 12,
      totals,
      completedHolesPar,
      completedHolesCount: 1,
    });

    expect(csv).toBe(
      'Round,Course,Date,Par,Score,Differential,Stableford,Handicap,Through holes,Fairway Long,Fairway Hit,Fairway Left,Fairway Right,Fairway Short,OOP Look,OOP No look,GIR Hit,GIR Left,GIR Right,GIR Long,GIR Short,Inside 100 Over 3,Inside 100 Bunkers,Inside 100 Wedges,Inside 100 Chip shots,Up & Down Up & down,Putting Total putts,Putting Miss long,Putting Miss short,Putting Miss within 2m,Penalties Penalties\n' +
        'Saturday Medal,Royal Park,2026-06-12,72,5,1,2,12,1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,2,0,0,0,1',
    );
  });

  it('builds a safe filename for download', () => {
    expect(buildRoundExportFilename('Saturday Medal #2', '2026-06-12')).toBe('saturday-medal-2-2026-06-12.csv');
    expect(buildRoundExportFilename('', '')).toBe('round.csv');
  });

  it('builds a multi-round CSV export with one shared header row', () => {
    const csv = buildAllRoundsExportCsv([
      {
        roundName: 'Round One',
        roundDate: '2026-06-01',
        courseName: 'Northcote',
        handicap: 3,
        totals: {
          score: 86,
          par: 68,
          stableford: 30,
          fairwayLong: 0,
          fairwayHit: 10,
          fairwayLeft: 1,
          fairwayRight: 2,
          fairwayShort: 4,
          oopLook: 5,
          oopNoLook: 1,
          girHit: 4,
          girLeft: 3,
          girRight: 0,
          girLong: 0,
          girShort: 6,
          inside100Over3: 5,
          inside100Bunkers: 2,
          inside100Wedges: 0,
          inside100ChipShots: 0,
          upAndDown: 3,
          totalPutts: 35,
          puttMissLong: 2,
          puttMissShort: 1,
          puttMissWithin2m: 2,
          penalties: 1,
          girNoChance: 0,
        },
        completedHolesPar: 68,
        completedHolesCount: 18,
      },
      {
        roundName: 'Round Two',
        roundDate: '2026-06-08',
        courseName: 'Ivanhoe',
        handicap: 2,
        totals: {
          score: 89,
          par: 68,
          stableford: 27,
          fairwayLong: 0,
          fairwayHit: 7,
          fairwayLeft: 0,
          fairwayRight: 0,
          fairwayShort: 0,
          oopLook: 0,
          oopNoLook: 0,
          girHit: 0,
          girLeft: 0,
          girRight: 0,
          girLong: 0,
          girShort: 0,
          inside100Over3: 8,
          inside100Bunkers: 0,
          inside100Wedges: 0,
          inside100ChipShots: 0,
          upAndDown: 0,
          totalPutts: 37,
          puttMissLong: 0,
          puttMissShort: 0,
          puttMissWithin2m: 0,
          penalties: 0,
          girNoChance: 0,
        },
        completedHolesPar: 68,
        completedHolesCount: 18,
      },
    ]);

    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Fairway Hit');
    expect(lines[1]).toContain('Round One,Northcote,2026-06-01,68,86,18,30,3,18');
    expect(lines[2]).toContain('Round Two,Ivanhoe,2026-06-08,68,89,21,27,2,18');
    expect(buildAllRoundsExportFilename()).toBe('all-rounds-export.csv');
  });
});
