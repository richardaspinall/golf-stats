import {
  BUNKER_LIE_OPTIONS,
  HAZARD_OPTIONS,
  LIE_QUALITY_OPTIONS,
  SLOPE_OPTIONS,
  SURFACE_OPTIONS,
  WIND_DIRECTION_OPTIONS,
  WIND_STRENGTH_OPTIONS,
} from '../constants';
import type { VirtualCaddyState } from '../types';

type SetupStepProps = {
  state: VirtualCaddyState;
  shotNumber: number;
  displayShotLabel: string;
  editingIndex: number | null;
  isPutting: boolean;
  isStandardShot: boolean;
  showOopOptions: boolean;
  shotDistanceBannerLabel: string;
  shotDistanceBannerValue: string | null;
  canResetShotDistanceBanner: boolean;
  distanceSliderMax: number;
  onCancelEdit: () => void;
  onBack: (() => void) | null;
  onNext: () => void;
  onResetBanner: () => void;
  onToggleAdvanced: () => void;
  onSetFlowStepAction: () => void;
  onSetOopResult: (value: 'none' | 'look' | 'noLook') => void;
  onSetDistanceMode: (value: 'hole' | 'point') => void;
  onSetHoleDistance: (value: number) => void;
  onSetShotDistance: (value: number) => void;
  onToggleHazard: (hazard: (typeof HAZARD_OPTIONS)[number]['key']) => void;
  onPatch: (patch: Partial<VirtualCaddyState>) => void;
};

export function SetupStep({
  state,
  shotNumber,
  displayShotLabel,
  editingIndex,
  isPutting,
  isStandardShot,
  showOopOptions,
  shotDistanceBannerLabel,
  shotDistanceBannerValue,
  canResetShotDistanceBanner,
  distanceSliderMax,
  onCancelEdit,
  onBack,
  onNext,
  onResetBanner,
  onToggleAdvanced,
  onSetOopResult,
  onSetDistanceMode,
  onSetHoleDistance,
  onSetShotDistance,
  onToggleHazard,
  onPatch,
}: SetupStepProps) {
  return (
    <div className="virtual-caddy-step">
      <div className="virtual-caddy-step-header">
        <div className="virtual-caddy-step-title">
          <span className="virtual-caddy-step-number">{shotNumber}</span>
          <div>
            <h5>{displayShotLabel}</h5>
          </div>
        </div>
        {editingIndex != null ? (
          <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={onCancelEdit}>
            ×
          </button>
        ) : null}
      </div>
      <div className="prototype-block virtual-caddy-distance-block">
        {!isPutting ? (
          <div className="virtual-caddy-overview-hero virtual-caddy-distance-hero">
            <span className="virtual-caddy-overview-kicker">{shotDistanceBannerLabel}</span>
            <div className="virtual-caddy-distance-hero-actions">
              <strong>{shotDistanceBannerValue}</strong>
              {canResetShotDistanceBanner ? (
                <button type="button" className="setup-toggle" onClick={onResetBanner}>
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {isPutting ? null : (
          <>
            {showOopOptions ? (
              <div className="prototype-block">
                <span className="quick-select-label">Out of position</span>
                <div className="quick-select-row">
                  {[
                    { key: 'none', label: 'No' },
                    { key: 'look', label: 'Look' },
                    { key: 'noLook', label: 'No look' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={state.oopResult === option.key ? 'choice-chip active' : 'choice-chip'}
                      onClick={() => onSetOopResult(option.key as 'none' | 'look' | 'noLook')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {isStandardShot ? (
              <div className="virtual-caddy-inline-toggle">
                <span className="quick-select-label">Shot target</span>
                <div className="quick-select-row">
                  <button type="button" className={state.distanceMode === 'hole' ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetDistanceMode('hole')}>
                    To green
                  </button>
                  <button type="button" className={state.distanceMode === 'point' ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetDistanceMode('point')}>
                    To target
                  </button>
                </div>
              </div>
            ) : null}
            {state.distanceMode === 'point' ? (
              <>
                <div className="prototype-block">
                  <div className="distance-header">
                    <span>Distance to green</span>
                    <strong>{state.distanceToHoleMeters}m</strong>
                  </div>
                  <div className="virtual-caddy-slider-stack">
                    <div className="virtual-caddy-slider-only-row">
                      <input
                        type="range"
                        min={0}
                        max={distanceSliderMax}
                        step={1}
                        value={Math.min(state.distanceToHoleMeters, distanceSliderMax)}
                        aria-label="Virtual caddy distance left to hole"
                        onChange={(event) => onSetHoleDistance(Number(event.target.value))}
                      />
                    </div>
                    <div className="virtual-caddy-slider-row">
                      <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters - 5)}>-5m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters - 1)}>-1m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters + 1)}>+1m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters + 5)}>+5m</button>
                    </div>
                  </div>
                </div>
                <div className="prototype-block">
                  <div className="distance-header">
                    <span>Distance to target</span>
                    <strong>{state.distanceToMiddleMeters}m</strong>
                  </div>
                  <div className="virtual-caddy-slider-stack">
                    <div className="virtual-caddy-slider-only-row">
                      <input
                        type="range"
                        min={0}
                        max={distanceSliderMax}
                        step={1}
                        value={Math.min(state.distanceToMiddleMeters, distanceSliderMax)}
                        aria-label="Virtual caddy distance to target"
                        onChange={(event) => onSetShotDistance(Number(event.target.value))}
                      />
                    </div>
                    <div className="virtual-caddy-slider-row">
                      <button type="button" className="choice-chip" onClick={() => onSetShotDistance(state.distanceToMiddleMeters - 5)}>-5m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetShotDistance(state.distanceToMiddleMeters - 1)}>-1m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetShotDistance(state.distanceToMiddleMeters + 1)}>+1m</button>
                      <button type="button" className="choice-chip" onClick={() => onSetShotDistance(state.distanceToMiddleMeters + 5)}>+5m</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="virtual-caddy-slider-stack">
                <div className="virtual-caddy-slider-only-row">
                  <input
                    type="range"
                    min={0}
                    max={distanceSliderMax}
                    step={1}
                    value={Math.min(state.distanceToHoleMeters, distanceSliderMax)}
                    aria-label="Virtual caddy distance to hole"
                    onChange={(event) => onSetHoleDistance(Number(event.target.value))}
                  />
                </div>
                <div className="virtual-caddy-slider-row">
                  <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters - 5)}>-5m</button>
                  <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters - 1)}>-1m</button>
                  <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters + 1)}>+1m</button>
                  <button type="button" className="choice-chip" onClick={() => onSetHoleDistance(state.distanceToHoleMeters + 5)}>+5m</button>
                </div>
              </div>
            )}
            <div className="virtual-caddy-setup-actions">
              <button type="button" className="setup-toggle" onClick={onToggleAdvanced} aria-expanded={state.showAdvanced}>
                {state.showAdvanced ? 'Hide detail' : 'Add detail'}
              </button>
            </div>
            {state.showAdvanced ? (
              <div className="virtual-caddy-advanced">
                <div className="prototype-block">
                  <span className="quick-select-label">Surface</span>
                  <div className="quick-select-row">
                    {SURFACE_OPTIONS.map((option) => (
                      <button key={option.key} type="button" className={state.surface === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ surface: option.key })}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {state.surface === 'bunker' ? (
                  <div className="prototype-block">
                    <span className="quick-select-label">Bunker lie</span>
                    <div className="quick-select-row">
                      {BUNKER_LIE_OPTIONS.map((option) => (
                        <button key={option.key} type="button" className={state.bunkerLie === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ bunkerLie: option.key })}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="prototype-block">
                  <span className="quick-select-label">Lie quality</span>
                  <div className="quick-select-row">
                    {LIE_QUALITY_OPTIONS.map((option) => (
                      <button key={option.key} type="button" className={state.lieQuality === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ lieQuality: option.key })}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Slope</span>
                  <div className="quick-select-row">
                    {SLOPE_OPTIONS.map((option) => (
                      <button key={option.key} type="button" className={state.slope === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ slope: option.key })}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prototype-block">
                  <span className="quick-select-label">Wind</span>
                  <div className="quick-select-row">
                    {WIND_DIRECTION_OPTIONS.map((option) => (
                      <button key={option.key} type="button" className={state.windDirection === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ windDirection: option.key })}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {state.windDirection !== 'none' ? (
                    <div className="quick-select-row">
                      {WIND_STRENGTH_OPTIONS.filter((option) => option.key !== 'calm').map((option) => (
                        <button key={option.key} type="button" className={state.windStrength === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onPatch({ windStrength: option.key })}>
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
                      <button key={option.key} type="button" className={state.hazards.includes(option.key) ? 'choice-chip active' : 'choice-chip'} onClick={() => onToggleHazard(option.key)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="virtual-caddy-card-footer">
        {onBack ? <button type="button" className="setup-toggle" onClick={onBack}>Back</button> : null}
        <button type="button" className="save-btn virtual-caddy-save-btn" onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
