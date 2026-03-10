import type { BUNKER_KEYS, COUNTER_OPTIONS, FAIRWAY_KEYS, GIR_KEYS, CLUB_OPTIONS } from '../constants.js';

export type CounterOption = (typeof COUNTER_OPTIONS)[number];
export type FairwaySelection = (typeof FAIRWAY_KEYS)[number];
export type GirSelection = (typeof GIR_KEYS)[number];
export type BunkerSelection = (typeof BUNKER_KEYS)[number];
export type ClubOption = (typeof CLUB_OPTIONS)[number];

export type LatLng = {
  lat: number;
  lng: number;
};

export type HoleStats = {
  score: number;
  holeIndex: number;
  fairwaySelection: FairwaySelection | null;
  girSelection: GirSelection | null;
  bunkerSelection: BunkerSelection | null;
  teePosition: LatLng | null;
  greenPosition: LatLng | null;
} & Record<CounterOption, number>;

export type StatsByHole = Record<number, HoleStats>;

export type CourseMarkersByHole = Record<
  number,
  {
    teePosition: LatLng | null;
    greenPosition: LatLng | null;
    holeIndex: number;
  }
>;

export type Round = {
  id: string;
  name: string;
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
