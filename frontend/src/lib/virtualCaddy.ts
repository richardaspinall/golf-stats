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
export type VirtualCaddyBunkerLie = 'clean' | 'softSand' | 'firmSand' | 'buried' | 'lip';
export type VirtualCaddyTemperature = 'cold' | 'normal' | 'hot';
export type VirtualCaddyWindDirection = 'none' | 'into' | 'helping' | 'leftToRight' | 'rightToLeft';
export type VirtualCaddyHazardSide = 'left' | 'right' | 'long' | 'short';

export interface VirtualCaddyInputs {
  distanceToMiddleMeters: number;
  surface?: VirtualCaddySurface;
  lieQuality?: 'good' | 'normal' | 'poor';
  slope?: VirtualCaddySlope;
  bunkerLie?: VirtualCaddyBunkerLie;
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

export const CLUB_PRIORITY = Object.keys(DEFAULT_CARRY_BY_CLUB);

const SURFACE_ADJUSTMENTS: Record<VirtualCaddySurface, number> = {
  tee: 0,
  fairway: 0,
  firstCut: 3,
  rough: 7,
  bunker: 12,
  recovery: 16,
};

const LIE_QUALITY_ADJUSTMENTS = {
  good: 0,
  normal: 2,
  poor: 5,
} as const;

const SLOPE_ADJUSTMENTS: Record<VirtualCaddySlope, number> = {
  flat: 0,
  uphill: 8,
  downhill: -6,
  ballAboveFeet: 1,
  ballBelowFeet: 4,
};

const BUNKER_LIE_ADJUSTMENTS: Record<VirtualCaddyBunkerLie, number> = {
  clean: 0,
  softSand: 2,
  firmSand: -2,
  buried: 8,
  lip: 5,
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
  bunkerLie: inputs.bunkerLie ?? 'clean',
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
    {
      label: `Bunker lie: ${normalized.bunkerLie}`,
      meters: normalized.surface === 'bunker' ? BUNKER_LIE_ADJUSTMENTS[normalized.bunkerLie] : 0,
    },
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

const buildPlayTips = (inputs: VirtualCaddyInputs) => {
  const normalized = normalizeInputs(inputs);
  const tips: string[] = [];

  if (normalized.surface === 'firstCut') {
    tips.push('First cut can grab the club slightly, so favor a committed strike.');
  }
  if (normalized.surface === 'rough') {
    tips.push('Rough reduces strike quality and spin control, so favor loft and the safer miss.');
  }
  if (normalized.surface === 'bunker') {
    tips.push('From a bunker lie, prioritize clean contact over perfect number control.');
    if (normalized.bunkerLie === 'clean') {
      tips.push('Clean bunker lie: use your standard splash and let the loft do the work.');
    }
    if (normalized.bunkerLie === 'softSand') {
      tips.push('Soft sand slows the club down, so use a little more speed or loft.');
    }
    if (normalized.bunkerLie === 'firmSand') {
      tips.push('Firm sand can make the club bounce into the ball, so take less sand and clip it cleaner.');
    }
    if (normalized.bunkerLie === 'buried') {
      tips.push('Buried lie: expect less spin and rollout control, so take more loft and play for the safe side.');
    }
    if (normalized.bunkerLie === 'lip') {
      tips.push('Lip in play: choose enough loft to clear the edge before worrying about exact distance.');
    }
  }
  if (normalized.surface === 'recovery') {
    tips.push('Recovery lie: advance the ball back into position before chasing the flag.');
  }

  if (normalized.lieQuality === 'normal') {
    tips.push('Average lie: expect slightly less clean contact than a perfect fairway lie.');
  }
  if (normalized.lieQuality === 'poor') {
    tips.push('Poor lie: expect less spin and control, so favor the bigger target.');
  }

  if (normalized.slope === 'uphill') {
    tips.push('Uphill lie adds loft and lands softer, so take more club and expect less rollout.');
    tips.push('Uphill lie can turn the ball over left, so favor a start line slightly right.');
  }
  if (normalized.slope === 'downhill') {
    tips.push('Downhill lie launches lower with more release, so expect extra rollout.');
    tips.push('Downhill lie tends to leak right, so favor a start line slightly left.');
  }
  if (normalized.slope === 'ballAboveFeet') {
    tips.push('Ball above feet tends to draw left; grip down slightly and start the ball a touch right.');
  }
  if (normalized.slope === 'ballBelowFeet') {
    tips.push('Ball below feet tends to fade right and lose distance; take more club and start it a touch left.');
  }

  return tips;
};

export const getCarryBook = (carryByClub?: Record<string, number>) =>
  CLUB_PRIORITY.filter((club) => typeof { ...DEFAULT_CARRY_BY_CLUB, ...carryByClub }[club] === 'number')
    .map((club) => ({ club, carry: ({ ...DEFAULT_CARRY_BY_CLUB, ...carryByClub } as Record<string, number>)[club] }))
    .sort((a, b) => a.carry - b.carry);

const pickClub = (effectiveDistanceMeters: number, carryByClub: Record<string, number>) => {
  const ordered = getCarryBook(carryByClub);

  const found = ordered.find(({ carry }) => carry >= effectiveDistanceMeters);
  return found ?? ordered[ordered.length - 1];
};

export const getLongestPlayableClub = (distanceMeters: number, carryByClub?: Record<string, number>) => {
  const ordered = getCarryBook(carryByClub);
  const withinDistance = ordered.filter(({ carry }) => carry <= distanceMeters);
  return withinDistance[withinDistance.length - 1] ?? ordered[0];
};

export const getLongestClubCarry = (carryByClub?: Record<string, number>) => {
  const ordered = getCarryBook(carryByClub);
  return ordered[ordered.length - 1]?.carry ?? 0;
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

const deriveSlopeAimBias = (slope: VirtualCaddySlope): 'center' | 'leftCenter' | 'rightCenter' => {
  if (slope === 'ballAboveFeet' || slope === 'uphill') {
    return 'rightCenter';
  }

  if (slope === 'ballBelowFeet' || slope === 'downhill') {
    return 'leftCenter';
  }

  return 'center';
};

const mergeAimBias = (
  primary: 'center' | 'leftCenter' | 'rightCenter',
  secondary: 'center' | 'leftCenter' | 'rightCenter',
): 'center' | 'leftCenter' | 'rightCenter' => {
  const toOffset = (value: 'center' | 'leftCenter' | 'rightCenter') => (value === 'rightCenter' ? 1 : value === 'leftCenter' ? -1 : 0);
  const merged = toOffset(primary) + toOffset(secondary);

  if (merged > 0) {
    return 'rightCenter';
  }
  if (merged < 0) {
    return 'leftCenter';
  }
  return 'center';
};

export const getVirtualCaddyRecommendation = (inputs: VirtualCaddyInputs): VirtualCaddyRecommendation => {
  const normalized = normalizeInputs(inputs);
  const carryByClub = { ...DEFAULT_CARRY_BY_CLUB, ...inputs.carryByClub };
  const adjustments = buildAdjustments(inputs);
  const playTips = buildPlayTips(inputs);
  const adjustedDistanceMeters = Math.max(
    1,
    Math.round(inputs.distanceToMiddleMeters + adjustments.reduce((total, item) => total + item.meters, 0)),
  );
  const club = pickClub(adjustedDistanceMeters, carryByClub);
  const aimBias = mergeAimBias(deriveAimBias(normalized.hazards), deriveSlopeAimBias(normalized.slope));
  const reasons = adjustments.map((item) => `${item.label} ${item.meters > 0 ? `+${item.meters}` : item.meters}m`);
  reasons.push(...playTips);

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
