export const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

export const COUNTER_OPTIONS = [
  'inside100Over3',
  'inside100Bunkers',
  'inside100Wedges',
  'inside100ChipShots',
  'oopLook',
  'oopNoLook',
  'penalties',
  'totalPutts',
  'puttMissLong',
  'puttMissShort',
  'puttMissWithin2m',
] as const;

export const FAIRWAY_KEYS = ['fairwayHit', 'fairwayLeft', 'fairwayRight'] as const;
export const GIR_KEYS = ['girHit', 'girLeft', 'girRight', 'girLong', 'girShort'] as const;
export const BUNKER_KEYS = ['bunkerLeft', 'bunkerRight', 'bunkerLong', 'bunkerShort'] as const;
export const VALID_FAIRWAY_KEYS = new Set(FAIRWAY_KEYS);
export const VALID_GIR_KEYS = new Set(GIR_KEYS);
export const VALID_BUNKER_KEYS = new Set(BUNKER_KEYS);

export const CLUB_OPTIONS = [
  '60',
  '56',
  '50',
  'PW',
  '9i',
  '8i',
  '7i',
  '6i',
  '5i',
  '4i',
  '5Hy',
  '5 wood',
  '3 wood',
  'Mini Driver',
  'Driver',
  'Putter',
] as const;
export const CLUB_OPTION_SET = new Set(CLUB_OPTIONS);

export const WEDGE_OPTIONS = ['60', '56', '50', 'PW'] as const;
export const WEDGE_OPTION_SET = new Set(WEDGE_OPTIONS);

export const SWING_CLOCK_OPTIONS = ['7:30', '9:00', '10:30', 'Full'] as const;
export const SWING_CLOCK_OPTION_SET = new Set(SWING_CLOCK_OPTIONS);
