export interface LatLng {
  lat: number;
  lng: number;
}

export interface StatOption {
  key: string;
  label: string;
  position?: string;
}

export interface StatSection {
  title: string;
  options: StatOption[];
}

export interface PersistedVirtualCaddyState {
  version: 1;
  baseHoleStats: HoleStats;
  trail: Array<Record<string, unknown>>;
  draft: Record<string, unknown>;
}

export interface HoleStats {
  score: number;
  holeIndex: number;
  fairwaySelection: string | null;
  girSelection: string | null;
  teePosition: LatLng | null;
  greenPosition: LatLng | null;
  manualScoreEnteredOnTrack?: boolean;
  virtualCaddyState?: PersistedVirtualCaddyState | null;
  [key: string]: unknown;
}

export type StatsByHole = Record<number, HoleStats>;

export interface CourseMarker {
  teePosition: LatLng | null;
  greenPosition: LatLng | null;
  holeIndex: number;
  par: number;
  distanceMeters?: number | null;
}

export type CourseMarkers = Record<number, CourseMarker>;

export interface RoundSummaryTotals {
  score: number;
  par: number;
  stableford: number;
  [key: string]: number;
}

export interface RoundSummaryData {
  totals: RoundSummaryTotals;
}

export interface RoundListItem {
  id: string;
  name: string;
  handicap?: number;
  roundDate?: string;
  courseId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Round extends RoundListItem {
  statsByHole: StatsByHole;
  notes: string[];
}

export interface Course {
  id: string;
  name: string;
  markers: CourseMarkers;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubAverage {
  club: string;
  avgMeters: number | null;
  shots: number;
}

export interface WedgeEntry {
  id: number;
  matrixId: number;
  club: string;
  swingClock: string;
  distanceMeters: number;
  createdAt: string;
}

export interface WedgeMatrix {
  id: number;
  name: string;
  stanceWidth: string;
  grip: string;
  ballPosition: string;
  notes: string;
  clubs: string[];
  swingClocks: string[];
  createdAt: string;
}

export type CarryByClub = Record<string, number>;

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  authMethod?: 'local' | 'google';
  googleLinked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
