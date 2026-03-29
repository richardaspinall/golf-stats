import { useMemo, useState } from 'react';

import {
  type VirtualCaddyHazardSide,
  type VirtualCaddyInputs,
  getVirtualCaddyRecommendation,
} from '../lib/virtualCaddy';

const DISTANCE_PRESETS = [100, 125, 150, 175, 200];

const SURFACE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['surface']>; label: string }> = [
  { key: 'fairway', label: 'Fairway' },
  { key: 'rough', label: 'Rough' },
  { key: 'firstCut', label: 'First cut' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'bunker', label: 'Bunker' },
];

const LIE_QUALITY_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['lieQuality']>; label: string }> = [
  { key: 'good', label: 'Good lie' },
  { key: 'normal', label: 'Normal lie' },
  { key: 'poor', label: 'Poor lie' },
];

const SLOPE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['slope']>; label: string }> = [
  { key: 'flat', label: 'Flat' },
  { key: 'uphill', label: 'Uphill' },
  { key: 'downhill', label: 'Downhill' },
  { key: 'ballAboveFeet', label: 'Ball above feet' },
  { key: 'ballBelowFeet', label: 'Ball below feet' },
];

const TEMPERATURE_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['temperature']>; label: string }> = [
  { key: 'cold', label: 'Cold' },
  { key: 'normal', label: 'Normal' },
  { key: 'hot', label: 'Hot' },
];

const WIND_DIRECTION_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windDirection']>; label: string }> = [
  { key: 'none', label: 'No wind' },
  { key: 'into', label: 'Into wind' },
  { key: 'helping', label: 'Helping wind' },
  { key: 'leftToRight', label: 'L to R' },
  { key: 'rightToLeft', label: 'R to L' },
];

const WIND_STRENGTH_OPTIONS: Array<{ key: NonNullable<VirtualCaddyInputs['windStrength']>; label: string }> = [
  { key: 'calm', label: 'Calm' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'strong', label: 'Strong' },
];

const HAZARD_OPTIONS: Array<{ key: VirtualCaddyHazardSide; label: string }> = [
  { key: 'left', label: 'Trouble left' },
  { key: 'right', label: 'Trouble right' },
  { key: 'short', label: 'Short-sided' },
  { key: 'long', label: 'Long is bad' },
];

type VirtualCaddyPanelProps = {
  defaultDistanceMeters: number | null;
  carryByClub?: Record<string, number>;
  onUseRecommendation: (payload: { club: string; targetDistanceMeters: number; lie: string }) => void;
};

const toLieSelection = (surface: NonNullable<VirtualCaddyInputs['surface']>) => {
  switch (surface) {
    case 'tee':
      return 'Tee';
    case 'fairway':
      return 'Fairway';
    case 'firstCut':
      return 'First cut';
    case 'rough':
      return 'Rough';
    case 'bunker':
      return 'Bunker';
    case 'recovery':
      return 'Recovery';
    default:
      return 'Fairway';
  }
};

export function VirtualCaddyPanel({ defaultDistanceMeters, carryByClub, onUseRecommendation }: VirtualCaddyPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [distanceToMiddleMeters, setDistanceToMiddleMeters] = useState(defaultDistanceMeters ?? 150);
  const [surface, setSurface] = useState<NonNullable<VirtualCaddyInputs['surface']>>('fairway');
  const [lieQuality, setLieQuality] = useState<NonNullable<VirtualCaddyInputs['lieQuality']>>('good');
  const [slope, setSlope] = useState<NonNullable<VirtualCaddyInputs['slope']>>('flat');
  const [temperature, setTemperature] = useState<NonNullable<VirtualCaddyInputs['temperature']>>('normal');
  const [windDirection, setWindDirection] = useState<NonNullable<VirtualCaddyInputs['windDirection']>>('none');
  const [windStrength, setWindStrength] = useState<NonNullable<VirtualCaddyInputs['windStrength']>>('calm');
  const [hazards, setHazards] = useState<VirtualCaddyHazardSide[]>([]);

  const recommendation = useMemo(
    () =>
      getVirtualCaddyRecommendation({
        distanceToMiddleMeters,
        surface,
        lieQuality,
        slope,
        temperature,
        windDirection,
        windStrength,
        hazards,
        carryByClub,
      }),
    [carryByClub, distanceToMiddleMeters, hazards, lieQuality, slope, surface, temperature, windDirection, windStrength],
  );

  const hasCustomContext =
    surface !== 'fairway' ||
    lieQuality !== 'good' ||
    slope !== 'flat' ||
    temperature !== 'normal' ||
    windDirection !== 'none' ||
    windStrength !== 'calm' ||
    hazards.length > 0;

  const toggleHazard = (hazard: VirtualCaddyHazardSide) => {
    setHazards((prev) => (prev.includes(hazard) ? prev.filter((item) => item !== hazard) : [...prev, hazard]));
  };

  return (
    <div className="track-distance-section virtual-caddy-section">
      <div className="virtual-caddy-header">
        <div>
          <p className="virtual-caddy-kicker">Virtual Caddy</p>
          <h4 className="section-title">Get a fast club pick before you track the shot</h4>
        </div>
        <button type="button" className="virtual-caddy-launch" onClick={() => setShowPanel((prev) => !prev)} aria-expanded={showPanel}>
          {showPanel ? 'Hide caddy' : 'Open caddy'}
        </button>
      </div>
      <p className="hint">
        Start with middle-of-green distance only. Add lie, wind, slope, and trouble only when you need a tighter recommendation.
      </p>

      {showPanel ? (
        <div className="virtual-caddy-panel active-panel">
          <div className="virtual-caddy-step">
            <div className="virtual-caddy-step-header">
              <span className="virtual-caddy-step-number">1</span>
              <div>
                <h5>Middle of green</h5>
                <p>Use the minimum info first.</p>
              </div>
            </div>
            <div className="prototype-block virtual-caddy-distance-block">
              {defaultDistanceMeters != null ? (
                <button
                  type="button"
                  className={distanceToMiddleMeters === defaultDistanceMeters ? 'virtual-caddy-distance-pill active' : 'virtual-caddy-distance-pill'}
                  onClick={() => setDistanceToMiddleMeters(defaultDistanceMeters)}
                >
                  Hole map says {defaultDistanceMeters}m
                </button>
              ) : null}
              <div className="preset-row" role="group" aria-label="Virtual caddy distance presets">
                {DISTANCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={distanceToMiddleMeters === preset ? 'choice-chip active' : 'choice-chip'}
                    onClick={() => setDistanceToMiddleMeters(preset)}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
              <div className="distance-header">
                <span>Distance</span>
                <strong>{distanceToMiddleMeters}m</strong>
              </div>
              <input
                type="range"
                min={30}
                max={260}
                step={1}
                value={distanceToMiddleMeters}
                aria-label="Virtual caddy distance to middle"
                onChange={(event) => setDistanceToMiddleMeters(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="virtual-caddy-recommendation">
            <div className="virtual-caddy-recommendation-copy">
              <p className="virtual-caddy-label">Recommended club</p>
              <div className="virtual-caddy-club-row">
                <strong>{recommendation.recommendedClub}</strong>
                <span>{recommendation.adjustedDistanceMeters}m effective</span>
              </div>
              <p className="virtual-caddy-summary">{recommendation.summary}</p>
            </div>
            <button
              type="button"
              className="save-btn"
              onClick={() =>
                onUseRecommendation({
                  club: recommendation.recommendedClub,
                  targetDistanceMeters: recommendation.details.effectiveDistanceMeters,
                  lie: toLieSelection(surface),
                })
              }
            >
              Use in tracker
            </button>
          </div>

          <div className="virtual-caddy-actions">
            <button type="button" className="setup-toggle" onClick={() => setShowAdvanced((prev) => !prev)} aria-expanded={showAdvanced}>
              {showAdvanced ? 'Hide extra detail' : 'Add detail'}
            </button>
            {hasCustomContext ? <p className="virtual-caddy-state-note">Recommendation adjusted for current conditions.</p> : null}
          </div>

          {showAdvanced ? (
            <div className="virtual-caddy-advanced">
              <div className="virtual-caddy-step">
                <div className="virtual-caddy-step-header">
                  <span className="virtual-caddy-step-number">2</span>
                  <div>
                    <h5>Shot context</h5>
                    <p>Only fill what matters for this shot.</p>
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Surface</span>
                  <div className="quick-select-row">
                    {SURFACE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={surface === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setSurface(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Lie quality</span>
                  <div className="quick-select-row">
                    {LIE_QUALITY_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={lieQuality === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setLieQuality(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Slope</span>
                  <div className="quick-select-row">
                    {SLOPE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={slope === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setSlope(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Temperature</span>
                  <div className="quick-select-row">
                    {TEMPERATURE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={temperature === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setTemperature(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Wind</span>
                  <div className="quick-select-row">
                    {WIND_DIRECTION_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={windDirection === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setWindDirection(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {windDirection !== 'none' ? (
                    <div className="quick-select-row">
                      {WIND_STRENGTH_OPTIONS.filter((option) => option.key !== 'calm').map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={windStrength === option.key ? 'choice-chip active' : 'choice-chip'}
                          onClick={() => setWindStrength(option.key)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Trouble</span>
                  <div className="quick-select-row">
                    {HAZARD_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={hazards.includes(option.key) ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => toggleHazard(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="prototype-block virtual-caddy-notes">
                <span className="quick-select-label">Why</span>
                <ul className="virtual-caddy-reason-list">
                  {recommendation.reasons.length > 0 ? (
                    recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)
                  ) : (
                    <li>Neutral stock shot. Aim at the middle.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
