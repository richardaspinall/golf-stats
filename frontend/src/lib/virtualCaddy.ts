export const DEFAULT_CARRY_BY_CLUB: Record<string, number> = {
  Driver: 230,
  'Mini Driver': 215,
  '3 wood': 205,
  '5 wood': 190,
  '5Hy': 180,
  '4i': 170,
  '5i': 160,
  '6i': 150,
  '7i': 140,
  '8i': 130,
  '9i': 120,
  PW: 110,
  '50': 95,
  '56': 80,
  '60': 65,
  Putter: 15,
};

export type VirtualCaddySurface = 'tee' | 'fairway' | 'firstCut' | 'rough' | 'bunker' | 'recovery';
export type VirtualCaddySlope = 'flat' | 'uphill' | 'downhill' | 'ballAboveFeet' | 'ballBelowFeet';
export type VirtualCaddyTemperature = 'cold' | 'normal' | 'hot';
export type VirtualCaddyWindDirection = 'none' | 'into' | 'helping' | 'leftToRight' | 'rightToLeft';
export type VirtualCaddyHazardSide = 'left' | 'right' | 'long' | 'short';

export interface VirtualCaddyInputs {
  distanceToMiddleMeters: number;
  surface?: VirtualCaddySurface;
  lieQuality?: 'good' | 'normal' | 'poor';
  slope?: VirtualCaddySlope;
  temperature?: VirtualCaddyTemperature;
  windDirection?: VirtualCaddyWindDirection;
  windStrength?: 'calm' | 'light' | 'moderate' | 'strong';
  hazards?: VirtualCaddyHazardSide[];
  carryByClub?: Record<string, number>;
}

export interface VirtualCaddyRecommendation {
  recommendedClub: string;
  adjustedDistanceMeters: number;
  aimBias: 'center' | 'leftCenter' | 'rightCenter';
  summary: string;
  reasons: string[];
  adjustments: Array<{ label: string; meters: number }>;
  details: {
    distanceToMiddleMeters: number;
    effectiveDistanceMeters: number;
    hazards: VirtualCaddyHazardSide[];
  };
}

const CLUB_PRIORITY = Object.keys(DEFAULT_CARRY_BY_CLUB);

const SURFACE_ADJUSTMENTS: Record<VirtualCaddySurface, number> = {
  tee: 0,
  fairway: 0,
  firstCut: 4,
  rough: 8,
  bunker: 14,
  recovery: 18,
};

const LIE_QUALITY_ADJUSTMENTS = {
  good: 0,
  normal: 2,
  poor: 6,
} as const;

const SLOPE_ADJUSTMENTS: Record<VirtualCaddySlope, number> = {
  flat: 0,
  uphill: 6,
  downhill: -4,
  ballAboveFeet: 3,
  ballBelowFeet: 4,
};

const TEMPERATURE_ADJUSTMENTS: Record<VirtualCaddyTemperature, number> = {
  cold: 5,
  normal: 0,
  hot: -3,
};

const WIND_STRENGTH_METERS = {
  calm: 0,
  light: 3,
  moderate: 7,
  strong: 12,
} as const;

const normalizeInputs = (inputs: VirtualCaddyInputs) => ({
  surface: inputs.surface ?? 'fairway',
  lieQuality: inputs.lieQuality ?? 'good',
  slope: inputs.slope ?? 'flat',
  temperature: inputs.temperature ?? 'normal',
  windDirection: inputs.windDirection ?? 'none',
  windStrength: inputs.windStrength ?? 'calm',
  hazards: inputs.hazards ?? [],
});

const buildAdjustments = (inputs: VirtualCaddyInputs) => {
  const normalized = normalizeInputs(inputs);
  const windMagnitude = WIND_STRENGTH_METERS[normalized.windStrength];
  const windMeters =
    normalized.windDirection === 'into'
      ? windMagnitude
      : normalized.windDirection === 'helping'
        ? -windMagnitude
        : 0;

  return [
    { label: `Surface: ${normalized.surface}`, meters: SURFACE_ADJUSTMENTS[normalized.surface] },
    { label: `Lie: ${normalized.lieQuality}`, meters: LIE_QUALITY_ADJUSTMENTS[normalized.lieQuality] },
    { label: `Slope: ${normalized.slope}`, meters: SLOPE_ADJUSTMENTS[normalized.slope] },
    { label: `Temperature: ${normalized.temperature}`, meters: TEMPERATURE_ADJUSTMENTS[normalized.temperature] },
    {
      label:
        normalized.windDirection === 'none'
          ? 'Wind: none'
          : `Wind: ${normalized.windDirection} ${normalized.windStrength}`,
      meters: windMeters,
    },
  ].filter((item) => item.meters !== 0);
};

const pickClub = (effectiveDistanceMeters: number, carryByClub: Record<string, number>) => {
  const ordered = CLUB_PRIORITY.filter((club) => typeof carryByClub[club] === 'number')
    .map((club) => ({ club, carry: carryByClub[club] }))
    .sort((a, b) => a.carry - b.carry);

  const found = ordered.find(({ carry }) => carry >= effectiveDistanceMeters);
  return found ?? ordered[ordered.length - 1];
};

const deriveAimBias = (hazards: VirtualCaddyHazardSide[]): 'center' | 'leftCenter' | 'rightCenter' => {
  const hasLeft = hazards.includes('left');
  const hasRight = hazards.includes('right');

  if (hasLeft && !hasRight) {
    return 'rightCenter';
  }

  if (hasRight && !hasLeft) {
    return 'leftCenter';
  }

  return 'center';
};

export const getVirtualCaddyRecommendation = (inputs: VirtualCaddyInputs): VirtualCaddyRecommendation => {
  const normalized = normalizeInputs(inputs);
  const carryByClub = { ...DEFAULT_CARRY_BY_CLUB, ...inputs.carryByClub };
  const adjustments = buildAdjustments(inputs);
  const adjustedDistanceMeters = Math.max(
    1,
    Math.round(inputs.distanceToMiddleMeters + adjustments.reduce((total, item) => total + item.meters, 0)),
  );
  const club = pickClub(adjustedDistanceMeters, carryByClub);
  const aimBias = deriveAimBias(normalized.hazards);
  const reasons = adjustments.map((item) => `${item.label} ${item.meters > 0 ? `+${item.meters}` : item.meters}m`);

  if (normalized.hazards.includes('left') && normalized.hazards.includes('right')) {
    reasons.push('Two-sided trouble: favor the most neutral start line.');
  } else if (normalized.hazards.includes('left')) {
    reasons.push('Left-side trouble: bias the target slightly right of center.');
  } else if (normalized.hazards.includes('right')) {
    reasons.push('Right-side trouble: bias the target slightly left of center.');
  }

  return {
    recommendedClub: club.club,
    adjustedDistanceMeters,
    aimBias,
    summary: `${club.club} for ${adjustedDistanceMeters}m effective. Aim ${
      aimBias === 'center' ? 'center green' : aimBias === 'leftCenter' ? 'left-center' : 'right-center'
    }.`,
    reasons,
    adjustments,
    details: {
      distanceToMiddleMeters: inputs.distanceToMiddleMeters,
      effectiveDistanceMeters: adjustedDistanceMeters,
      hazards: normalized.hazards,
    },
  };
};
