import { describe, expect, it } from 'vitest';
import { BUNKER_KEYS, CLUB_OPTIONS, COUNTER_OPTIONS, FAIRWAY_KEYS, GIR_KEYS, HOLES } from '../src/constants.js';
import {
  sanitizeActualMeters,
  sanitizeCarryMeters,
  sanitizeClubCarryPayload,
  sanitizeCourseMarkers,
  sanitizeRoundHandicap,
  sanitizeRoundName,
  sanitizeRoundNotes,
  sanitizeStats,
} from '../src/domain/sanitize.js';

const sampleStats = () => ({
  1: {
    score: 4,
    holeIndex: 1,
    fairwaySelection: FAIRWAY_KEYS[0],
    girSelection: GIR_KEYS[0],
    bunkerSelection: BUNKER_KEYS[0],
    teePosition: { lat: -37.8, lng: 144.9 },
    greenPosition: { lat: -37.9, lng: 145.0 },
    inside100Over3: 2,
    inside100Bunkers: 1,
    inside100Wedges: 1,
    inside100ChipShots: 0,
    oopLook: 0,
    oopNoLook: 0,
    penalties: 1,
    totalPutts: 14,
    puttMissLong: 2,
    puttMissShort: 3,
    puttMissWithin2m: 1,
  },
});

describe('sanitizeStats', () => {
  it('fills missing holes and clamps invalid values', () => {
    const stats = sanitizeStats({
      1: {
        score: -2,
        holeIndex: 19,
        fairwaySelection: 'invalid',
        girSelection: null,
        teePosition: { lat: 200, lng: 0 },
        greenPosition: { lat: -37.1, lng: 145.2 },
        inside100Over3: 2.7,
        quickEntrySaved: 1,
      },
    });

    HOLES.forEach((hole) => {
      expect(stats[hole]).toBeTruthy();
    });

    expect(stats[1].score).toBe(0);
    expect(stats[1].holeIndex).toBe(18);
    expect(stats[1].fairwaySelection).toBeNull();
    expect(stats[1].girSelection).toBeNull();
    expect(stats[1].bunkerSelection).toBeNull();
    expect(stats[1].teePosition).toBeNull();
    expect(stats[1].greenPosition).toEqual({ lat: -37.1, lng: 145.2 });
    expect(stats[1].inside100Over3).toBe(2);
    expect(stats[1].quickEntrySaved).toBe(true);

    COUNTER_OPTIONS.forEach((key) => {
      expect(Number.isFinite(stats[1][key])).toBe(true);
    });
  });

  it('accepts valid input', () => {
    const stats = sanitizeStats({
      ...sampleStats(),
      1: {
        ...sampleStats()[1],
        quickEntrySaved: true,
        virtualCaddyState: {
          version: 1,
          trail: [{ label: 'Tee shot' }],
        },
      },
    });
    expect(stats[1].fairwaySelection).toBe(FAIRWAY_KEYS[0]);
    expect(stats[1].girSelection).toBe(GIR_KEYS[0]);
    expect(stats[1].bunkerSelection).toBe(BUNKER_KEYS[0]);
    expect(stats[1].quickEntrySaved).toBe(true);
    expect(stats[1].virtualCaddyState).toEqual({
      version: 1,
      trail: [{ label: 'Tee shot' }],
    });
  });
});

describe('sanitizeCourseMarkers', () => {
  it('fills defaults and validates lat/lng', () => {
    const markers = sanitizeCourseMarkers({
      1: {
        teePosition: { lat: 91, lng: 0 },
        greenPosition: { lat: -37.9, lng: 145.1 },
        holeIndex: 0,
        par: 9,
      },
    });

    HOLES.forEach((hole) => {
      expect(markers[hole]).toBeTruthy();
    });

    expect(markers[1].teePosition).toBeNull();
    expect(markers[1].greenPosition).toEqual({ lat: -37.9, lng: 145.1 });
    expect(markers[1].holeIndex).toBe(1);
    expect(markers[1].par).toBe(6);
    expect(markers[2].par).toBe(4);
  });
});

describe('sanitizeRoundNotes', () => {
  it('normalizes array input', () => {
    const notes = sanitizeRoundNotes(['  hello  ', '', 'ok']);
    expect(notes).toEqual(['hello', 'ok']);
  });

  it('wraps legacy string input', () => {
    const notes = sanitizeRoundNotes(' legacy ');
    expect(notes).toEqual(['legacy']);
  });
});

describe('sanitizeRoundName', () => {
  it('uses fallback when blank', () => {
    expect(sanitizeRoundName('', 3)).toBe('Round 3');
  });
});

describe('sanitizeRoundHandicap', () => {
  it('rounds and clamps handicap values', () => {
    expect(sanitizeRoundHandicap('11.6')).toBe(12);
    expect(sanitizeRoundHandicap(-3)).toBe(0);
    expect(sanitizeRoundHandicap(99)).toBe(54);
    expect(sanitizeRoundHandicap('bad')).toBe(0);
  });
});

describe('sanitizeClubCarryPayload', () => {
  it('filters and clamps club carry values', () => {
    const payload = sanitizeClubCarryPayload({
      [CLUB_OPTIONS[0]]: 145.7,
      invalid: 200,
      [CLUB_OPTIONS[1]]: -2,
    });

    expect(payload).toEqual({
      [CLUB_OPTIONS[0]]: 146,
    });
  });
});

describe('sanitizeCarryMeters', () => {
  it('clamps values', () => {
    expect(sanitizeCarryMeters(450)).toBe(400);
    expect(sanitizeCarryMeters(-1)).toBeNull();
  });
});

describe('sanitizeActualMeters', () => {
  it('clamps values', () => {
    expect(sanitizeActualMeters(520)).toBe(500);
    expect(sanitizeActualMeters(0)).toBeNull();
  });
});
