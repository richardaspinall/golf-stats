export const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

export const COUNTER_OPTIONS = [
  'inside100Over3',
  'inside100Bunkers',
  'inside100Wedges',
  'inside100ChipShots',
  'oopLook',
  'oopNoLook',
  'penalties',
  'onePutts',
  'threePutts',
] as const;

export const FAIRWAY_KEYS = ['fairwayHit', 'fairwayLeft', 'fairwayRight'] as const;
export const GIR_KEYS = ['girHit', 'girLeft', 'girRight', 'girLong', 'girShort'] as const;
export const VALID_FAIRWAY_KEYS = new Set(FAIRWAY_KEYS);
export const VALID_GIR_KEYS = new Set(GIR_KEYS);

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
