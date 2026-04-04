import type {
  BUNKER_KEYS,
  COUNTER_OPTIONS,
  FAIRWAY_KEYS,
  GIR_KEYS,
  CLUB_OPTIONS,
  SWING_CLOCK_OPTIONS,
  WEDGE_OPTIONS,
} from '../constants.js';

export type CounterOption = (typeof COUNTER_OPTIONS)[number];
export type FairwaySelection = (typeof FAIRWAY_KEYS)[number];
export type GirSelection = (typeof GIR_KEYS)[number];
export type BunkerSelection = (typeof BUNKER_KEYS)[number];
export type ClubOption = (typeof CLUB_OPTIONS)[number];
export type WedgeOption = (typeof WEDGE_OPTIONS)[number];
export type SwingClockOption = (typeof SWING_CLOCK_OPTIONS)[number];

export type LatLng = {
  lat: number;
  lng: number;
};

export type HolePrepPlan = {
  strategy: string;
  danger: string;
  aim: string;
  plannedTeeClub: string;
  plannedLayupClub: string;
  commitmentCue: string;
};

export type HoleStats = {
  score: number;
  holeIndex: number;
  fairwaySelection: FairwaySelection | null;
  girSelection: GirSelection | null;
  bunkerSelection: BunkerSelection | null;
  teePosition: LatLng | null;
  greenPosition: LatLng | null;
  prepPlan: HolePrepPlan;
  quickEntrySaved?: boolean;
  virtualCaddyState?: Record<string, unknown> | null;
} & Record<CounterOption, number>;

export type StatsByHole = Record<number, HoleStats>;

export type CourseMarkersByHole = Record<
  number,
  {
    teePosition: LatLng | null;
    greenPosition: LatLng | null;
    holeIndex: number;
    par: number;
    distanceMeters?: number | null;
  }
>;

export type Round = {
  id: string;
  userId: string;
  name: string;
  roundDate: string;
  handicap: number;
  courseId: string | null;
  statsByHole: StatsByHole;
  notes: string[];
  createdAt: string;
  updatedAt: string;
};

export type Course = {
  id: string;
  name: string;
  markers: CourseMarkersByHole;
  createdAt: string;
  updatedAt: string;
};

export type ClubCarryByClub = Partial<Record<ClubOption, number>>;

export type ClubActualAverage = {
  shots: number;
  avgMeters: number;
};

export type ClubAveragesByClub = Partial<Record<ClubOption, ClubActualAverage>>;

export type ClubActualEntry = {
  id: number;
  club: ClubOption;
  actualMeters: number;
  createdAt: string;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  authMethod: 'local' | 'google';
  googleLinked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WedgeEntry = {
  id: number;
  matrixId: number;
  club: ClubOption;
  swingClock: string;
  distanceMeters: number;
  createdAt: string;
};

export type WedgeMatrix = {
  id: number;
  name: string;
  stanceWidth: string;
  grip: string;
  ballPosition: string;
  notes: string;
  clubs: ClubOption[];
  swingClocks: string[];
  createdAt: string;
};
