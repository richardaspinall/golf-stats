import type { StatSection } from '../types';

export const HOLES = Array.from({ length: 18 }, (_, index) => index + 1);
export const HOLE_INDEX_OPTIONS = Array.from({ length: 18 }, (_, index) => index + 1);

export const COUNTER_SECTIONS: StatSection[] = [
  {
    title: 'Out of Position (OOP)',
    options: [
      { key: 'oopLook', label: 'Look' },
      { key: 'oopNoLook', label: 'No look' },
    ],
  },
  {
    title: 'Inside 100 (Over 3 within 100m score)',
    options: [
      { key: 'inside100Over3', label: 'Over 3' },
      { key: 'inside100Bunkers', label: 'Bunkers' },
      { key: 'inside100Wedges', label: 'Wedges' },
      { key: 'inside100ChipShots', label: 'Chip shots' },
    ],
  },
  {
    title: 'Putting',
    options: [
      { key: 'totalPutts', label: 'Total putts' },
      { key: 'puttMissLong', label: 'Miss long' },
      { key: 'puttMissShort', label: 'Miss short' },
      { key: 'puttMissWithin2m', label: 'Miss within 2m' },
    ],
  },
  {
    title: 'Penalties',
    options: [{ key: 'penalties', label: 'Penalties' }],
  },
];

export const FAIRWAY_SECTION = {
  title: 'Fairway Hit',
  options: [
    { key: 'fairwayLong', label: 'Long', position: 'long' },
    { key: 'fairwayHit', label: 'Hit', position: 'center' },
    { key: 'fairwayLeft', label: 'Left', position: 'left' },
    { key: 'fairwayRight', label: 'Right', position: 'right' },
    { key: 'fairwayShort', label: 'Short', position: 'short' },
  ],
};

export const GIR_SECTION = {
  title: 'Green in Regulation',
  options: [
    { key: 'girHit', label: 'Hit', position: 'center' },
    { key: 'girLeft', label: 'Left', position: 'left' },
    { key: 'girRight', label: 'Right', position: 'right' },
    { key: 'girLong', label: 'Long', position: 'long' },
    { key: 'girShort', label: 'Short', position: 'short' },
  ],
};

const getStatSectionOrder = (counterSections: StatSection[]): StatSection[] => {
  const byTitle = new Map(counterSections.map((section) => [section.title, section]));
  const ordered: StatSection[] = [];
  const addIfFound = (title: string) => {
    const section = byTitle.get(title);
    if (section) {
      ordered.push(section);
      byTitle.delete(title);
    }
  };

  addIfFound('Out of Position (OOP)');
  addIfFound('Inside 100 (Over 3 within 100m score)');
  addIfFound('Putting');
  addIfFound('Penalties');

  return [...ordered, ...Array.from(byTitle.values())];
};

const orderedCounterSections = getStatSectionOrder(COUNTER_SECTIONS);
export const OOP_COUNTER_SECTION =
  orderedCounterSections.find((section) => section.title === 'Out of Position (OOP)') ?? null;
export const NON_OOP_COUNTER_SECTIONS = orderedCounterSections.filter(
  (section) => section.title !== 'Out of Position (OOP)',
);

export const STAT_SECTIONS: StatSection[] = [
  {
    title: FAIRWAY_SECTION.title,
    options: FAIRWAY_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
  ...(OOP_COUNTER_SECTION ? [OOP_COUNTER_SECTION] : []),
  {
    title: GIR_SECTION.title,
    options: GIR_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
  ...NON_OOP_COUNTER_SECTIONS,
];

export const COUNTER_OPTIONS = COUNTER_SECTIONS.flatMap((section) => section.options);
export const FAIRWAY_KEYS = FAIRWAY_SECTION.options.map((option) => option.key);
export const VALID_FAIRWAY_KEYS = new Set(FAIRWAY_KEYS);
export const GIR_KEYS = GIR_SECTION.options.map((option) => option.key);
export const VALID_GIR_KEYS = new Set(GIR_KEYS);
export const TOTAL_OPTIONS = [...COUNTER_OPTIONS, ...FAIRWAY_SECTION.options, ...GIR_SECTION.options];

export const SHOT_SETUP_OPTIONS = [
  { key: 'openStance', label: 'Open stance' },
  { key: 'closedStance', label: 'Closed stance' },
  { key: 'squareStance', label: 'Square' },
];

export const SWING_CLOCK_OPTIONS = ['7:30', '9:00', '10:30', 'Full'];

export const CLUB_GROUPS = [
  { label: 'Wedges', options: ['60', '56', '50', 'PW'] },
  { label: 'Irons + Hybrid', options: ['9i', '8i', '7i', '6i', '5i', '4i', '5Hy'] },
  { label: 'Woods', options: ['5 wood', '3 wood'] },
  { label: 'Drivers', options: ['Mini Driver', 'Driver'] },
  { label: 'Putter', options: ['Putter'] },
];

export const CLUB_OPTIONS = CLUB_GROUPS.flatMap((group) => group.options);
export const CLUB_OPTION_SET = new Set(CLUB_OPTIONS);
export const WEDGE_OPTIONS = CLUB_GROUPS.find((group) => group.label === 'Wedges')?.options ?? ['60', '56', '50', 'PW'];
export const LIE_OPTIONS = ['Tee', 'Fairway', 'First cut', 'Rough', 'Bunker', 'Recovery'];
