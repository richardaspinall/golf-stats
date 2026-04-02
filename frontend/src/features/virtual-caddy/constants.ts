import type { VirtualCaddyInputs } from '../../lib/virtualCaddy';
import type { VirtualCaddyBunkerLie, VirtualCaddyHazardSide } from '../../lib/virtualCaddy';
import type { VirtualCaddyOutcomeSelection } from '../../lib/virtualCaddyExecution';

export const CHIPPING_MAX_DISTANCE_METERS = 40;

export const SURFACE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['surface']>; label: string }> = [
  { key: 'tee', label: 'Tee' },
  { key: 'fairway', label: 'Fairway' },
  { key: 'rough', label: 'Rough' },
  { key: 'firstCut', label: 'First cut' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'bunker', label: 'Bunker' },
];

export const LIE_QUALITY_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['lieQuality']>; label: string }> = [
  { key: 'good', label: 'Good lie' },
  { key: 'normal', label: 'Normal lie' },
  { key: 'poor', label: 'Poor lie' },
];

export const SLOPE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['slope']>; label: string }> = [
  { key: 'flat', label: 'Flat' },
  { key: 'uphill', label: 'Uphill' },
  { key: 'downhill', label: 'Downhill' },
  { key: 'ballAboveFeet', label: 'Ball above feet' },
  { key: 'ballBelowFeet', label: 'Ball below feet' },
];

export const BUNKER_LIE_OPTIONS: Array<{ key: VirtualCaddyBunkerLie; label: string }> = [
  { key: 'clean', label: 'Clean' },
  { key: 'softSand', label: 'Soft sand' },
  { key: 'firmSand', label: 'Firm sand' },
  { key: 'buried', label: 'Buried' },
  { key: 'lip', label: 'Lip in play' },
];

export const WIND_DIRECTION_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windDirection']>; label: string }> = [
  { key: 'none', label: 'No wind' },
  { key: 'into', label: 'Into wind' },
  { key: 'helping', label: 'Helping wind' },
  { key: 'leftToRight', label: 'L to R' },
  { key: 'rightToLeft', label: 'R to L' },
];

export const WIND_STRENGTH_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windStrength']>; label: string }> = [
  { key: 'calm', label: 'Calm' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'strong', label: 'Strong' },
];

export const HAZARD_OPTIONS: Array<{ key: VirtualCaddyHazardSide; label: string }> = [
  { key: 'left', label: 'Trouble left' },
  { key: 'right', label: 'Trouble right' },
  { key: 'short', label: 'Short-sided' },
  { key: 'long', label: 'Long is bad' },
];

export const FAIRWAY_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'fairwayHit', label: 'Fairway hit' },
  { key: 'fairwayLeft', label: 'Left' },
  { key: 'fairwayRight', label: 'Right' },
  { key: 'fairwayShort', label: 'Short' },
  { key: 'fairwayLong', label: 'Long' },
];

export const GIR_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'girHit', label: 'Green hit' },
  { key: 'girHoled', label: 'Holed' },
  { key: 'girLeft', label: 'Left' },
  { key: 'girRight', label: 'Right' },
  { key: 'girShort', label: 'Short' },
  { key: 'girLong', label: 'Long' },
];

export const CHIP_OUTCOME_OPTIONS: Array<{ key: VirtualCaddyOutcomeSelection; label: string }> = [
  { key: 'chipOnGreen', label: 'On green' },
  { key: 'chipMissGreen', label: 'Miss green' },
];

export const PUTT_COUNT_OPTIONS = [1, 2, 3] as const;
export const PENALTY_STROKE_OPTIONS = [0, 1, 2] as const;
export const PUTTING_DETAIL_OPTIONS = [
  { key: 'puttMissLong', label: 'Miss long' },
  { key: 'puttMissShort', label: 'Miss short' },
  { key: 'puttMissWithin2m', label: 'Miss within 2m' },
] as const;

export const WEDGE_CLUBS = new Set(['PW', '50w', '56w', '60w']);
