import { useState } from 'react';

import { HolePicker } from '../HolePicker';
import {
  CLUB_GROUPS,
  FAIRWAY_SECTION,
  GIR_SECTION,
  HOLES,
  LIE_OPTIONS,
  NON_OOP_COUNTER_SECTIONS,
  OOP_COUNTER_SECTION,
  SHOT_SETUP_OPTIONS,
  SWING_CLOCK_OPTIONS,
} from '../../lib/constants';
import type { HoleStats, RoundListItem, RoundSummaryTotals } from '../../types';

const LEFT_OFFLINE_OPTIONS = [-5, -10, -15];
const RIGHT_OFFLINE_OPTIONS = [5, 10, 15];

type TrackPageProps = {
  round: {
    selectedHole: number;
    displayHoleIndex: number;
    displayHolePar: number | null;
    activeRound?: RoundListItem;
    activeCourseName?: string;
    holeStats: HoleStats;
    selectedRoundId: string;
    saveState: string;
    totals: RoundSummaryTotals;
    completedHoleCount: number;
  };
  distance: {
    showDistanceTracker: boolean;
    targetDistanceMeters: number;
    actualDistanceUnit: string;
    actualDistanceMeters: number;
    actualDistancePaces: number;
    offlineMeters: number | null;
    clubSelection: string;
    lieSelection: string;
    setupSelection: string;
    swingClock: string;
    shotLogSaveState: string;
  };
  actions: {
    setSelectedHole: (hole: number) => void;
    setShowDistanceTracker: (value: boolean) => void;
    setDistanceMode: (value: string) => void;
    setTargetDistanceMeters: (value: number) => void;
    setActualDistanceUnit: (value: string) => void;
    setActualDistanceMeters: (value: number) => void;
    setActualDistancePaces: (value: number) => void;
    setOfflineMeters: (value: number | null) => void;
    setClubSelection: (value: string | ((prev: string) => string)) => void;
    setLieSelection: (value: string | ((prev: string) => string)) => void;
    toggleSetupSelection: (setupKey: string) => void;
    setSwingClock: (value: string | ((prev: string) => string)) => void;
    closeDistanceTracker: () => void;
    addShotPrototypeNote: () => void;
    updateHoleScore: (hole: number, delta: number) => void;
    setFairwaySelection: (hole: number, key: string) => void;
    updateStats: (hole: number, key: string, delta: number) => void;
    setGirSelection: (hole: number, key: string) => void;
    saveCurrentRound: () => void;
    saveAndNextHole: () => void;
  };
  helpers: {
    metersToPaces: (meters: number) => number;
    pacesToMeters: (paces: number) => number;
  };
};

export function TrackPage({ round, distance, actions, helpers }: TrackPageProps) {
  const [showAdvancedDistanceOptions, setShowAdvancedDistanceOptions] = useState(false);
  const {
    selectedHole,
    displayHoleIndex,
    displayHolePar,
    activeRound,
    activeCourseName,
    holeStats,
    selectedRoundId,
    saveState,
    totals,
    completedHoleCount,
  } = round;
  const holeIndexClass =
    displayHoleIndex <= 6 ? 'hole-index hole-index-hard' : displayHoleIndex <= 12 ? 'hole-index hole-index-mid' : 'hole-index hole-index-easy';
  const {
    showDistanceTracker,
    targetDistanceMeters,
    actualDistanceUnit,
    actualDistanceMeters,
    actualDistancePaces,
    offlineMeters,
    clubSelection,
    lieSelection,
    setupSelection,
    swingClock,
    shotLogSaveState,
  } = distance;
  const {
    setSelectedHole,
    setShowDistanceTracker,
    setDistanceMode,
    setTargetDistanceMeters,
    setActualDistanceUnit,
    setActualDistanceMeters,
    setActualDistancePaces,
    setOfflineMeters,
    setClubSelection,
    setLieSelection,
    toggleSetupSelection,
    setSwingClock,
    closeDistanceTracker,
    addShotPrototypeNote,
    updateHoleScore,
    setFairwaySelection,
    updateStats,
    setGirSelection,
    saveCurrentRound,
    saveAndNextHole,
  } = actions;
  const { metersToPaces, pacesToMeters } = helpers;
  const visibleCounterSections = NON_OOP_COUNTER_SECTIONS.filter((section) => {
    const shouldShowInside100 = ['girLeft', 'girRight', 'girLong', 'girShort'].includes(String(holeStats.girSelection));
    return section.title === 'Inside 100 (Over 3 within 100m score)' || section.title === 'Up & Down' ? shouldShowInside100 : true;
  });
  const scoreToPar = totals.score - totals.par;
  const scoreToParLabel = scoreToPar === 0 ? 'Level par' : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
  const totalScoreLabel = selectedRoundId ? totals.score : '—';
  const fairwayHitsLabel = selectedRoundId ? totals.fairwayHit : '—';
  const girHitsLabel = selectedRoundId ? totals.girHit : '—';
  const stablefordLabel = selectedRoundId ? totals.stableford : '—';

  const closeDistancePanel = () => {
    setShowAdvancedDistanceOptions(false);
    closeDistanceTracker();
  };
  const adjustActualDistanceMeters = (delta: number) => {
    setActualDistanceMeters(Math.max(10, Math.min(300, actualDistanceMeters + delta)));
  };
  const adjustActualDistancePaces = (delta: number) => {
    const minPaces = metersToPaces(10);
    const maxPaces = metersToPaces(300);
    setActualDistancePaces(Math.max(minPaces, Math.min(maxPaces, actualDistancePaces + delta)));
  };

  return (
    <>
      <section className="card track-hero" aria-label="round snapshot">
        <div className="track-hero-copy">
          <p className="section-kicker">Live tracking</p>
          <h2>{activeRound?.name || 'Start a round to track your data'}</h2>
          <p className="track-hero-summary">
            {activeCourseName || 'No course selected'}
            <span aria-hidden="true"> · </span>
            Hole {selectedHole} of {HOLES.length}
            <span aria-hidden="true"> · </span>
            {completedHoleCount} complete
          </p>
        </div>
        <div className="track-hero-stats">
          <div className="hero-stat">
            <span>Total</span>
            <strong>{totalScoreLabel}</strong>
            <small>{scoreToParLabel}</small>
          </div>
          <div className="hero-stat">
            <span>Fairways</span>
            <strong>{fairwayHitsLabel}</strong>
            <small>Hit</small>
          </div>
          <div className="hero-stat">
            <span>GIR</span>
            <strong>{girHitsLabel}</strong>
            <small>Greens</small>
          </div>
          <div className="hero-stat">
            <span>Stableford</span>
            <strong>{stablefordLabel}</strong>
            <small>Points</small>
          </div>
        </div>
      </section>

      <HolePicker holes={HOLES} selectedHole={selectedHole} onSelect={setSelectedHole} />

      <section className="track-layout" aria-label="tracking dashboard">
        <div className="track-primary-column">
          <section className="card track-hole-overview" aria-label="hole overview">
            <div className="hole-header">
              <div>
                <p className="section-kicker">Current hole</p>
                <h2>Hole {selectedHole}</h2>
              </div>
              <div className="hole-badge-row">
                <span className="hole-chip">Par {displayHolePar ?? '—'}</span>
                <span className={holeIndexClass}>Index {displayHoleIndex}</span>
              </div>
            </div>
            <p className="hint">Round: {activeRound?.name || 'No active round selected'}</p>

            <div className="track-overview-grid">
              <section className="track-score-card">
                <div className="track-score-card-header">
                  <div>
                    <p className="section-kicker">Score control</p>
                    <h3 className="section-title">Lock in the hole outcome</h3>
                  </div>
                  <span className={`status-chip ${saveState}`}>{saveState}</span>
                </div>
                <div className="score-orb">
                  <span className="score-orb-label">Strokes</span>
                  <strong>{holeStats.score}</strong>
                </div>
                <div className="score-adjuster">
                  <button type="button" onClick={() => updateHoleScore(selectedHole, -1)} aria-label="Decrease score">
                    −
                  </button>
                  <button type="button" onClick={() => updateHoleScore(selectedHole, 1)} aria-label="Increase score">
                    +
                  </button>
                </div>
                <p className="track-score-caption">Capture score first, then mark tee shot, green outcome, and short-game details below.</p>
              </section>

              <section className="track-shot-launch">
                <p className="section-kicker">Shot capture</p>
                <h3 className="section-title">{showDistanceTracker ? 'Shot setup is open' : 'Log a distance for this hole'}</h3>
                <p className="hint">
                  Build a quick record with club, lie, distance, offline pattern, and clock notes for practice review later.
                </p>
                {!showDistanceTracker ? (
                  <button
                    type="button"
                    className="save-btn shot-launch-btn"
                    onClick={() => {
                      setShowAdvancedDistanceOptions(false);
                      setShowDistanceTracker(true);
                      setDistanceMode('setup');
                    }}
                  >
                    Open shot tracker
                  </button>
                ) : (
                  <button type="button" className="setup-toggle shot-launch-btn" onClick={closeDistancePanel}>
                    Collapse shot tracker
                  </button>
                )}
              </section>
            </div>
          </section>

          <div className="track-section-grid">
            <section className="card target-card">
              <div className="target-card-header">
                <div>
                  <p className="section-kicker">Tee shot</p>
                  <h3 className="section-title">{FAIRWAY_SECTION.title}</h3>
                </div>
                <p className="hint">Mark the starting line and final fairway result.</p>
              </div>
              <div className="fairway-menu" role="group" aria-label="Fairway direction">
                {FAIRWAY_SECTION.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={
                      holeStats.fairwaySelection === option.key
                        ? `directional-btn ${option.position} active`
                        : `directional-btn ${option.position}`
                    }
                    onClick={() => setFairwaySelection(selectedHole, option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="card target-card">
              <div className="target-card-header">
                <div>
                  <p className="section-kicker">Approach</p>
                  <h3 className="section-title">{GIR_SECTION.title}</h3>
                </div>
                <p className="hint">Track where the approach finished relative to the target.</p>
              </div>
              <div className="gir-menu" role="group" aria-label="GIR direction">
                {GIR_SECTION.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={
                      holeStats.girSelection === option.key
                        ? `directional-btn ${option.position} active`
                        : `directional-btn ${option.position}`
                    }
                    onClick={() => setGirSelection(selectedHole, option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="track-stat-grid" aria-label="hole detail counters">
            {OOP_COUNTER_SECTION ? (
              <div className="card stat-panel">
                <div className="stat-panel-header">
                  <div>
                    <p className="section-kicker">Recovery</p>
                    <h3 className="section-title">{OOP_COUNTER_SECTION.title}</h3>
                  </div>
                </div>
                <div className="stat-list">
                  {OOP_COUNTER_SECTION.options.map((stat) => (
                    <div key={stat.key} className="stat-row">
                      <span>{stat.label}</span>
                      <div className="stat-actions">
                        <button type="button" onClick={() => updateStats(selectedHole, stat.key, -1)}>
                          -
                        </button>
                        <strong>{Number(holeStats[stat.key] || 0)}</strong>
                        <button type="button" onClick={() => updateStats(selectedHole, stat.key, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleCounterSections.map((section) => (
              <div key={section.title} className="card stat-panel">
                <div className="stat-panel-header">
                  <div>
                    <p className="section-kicker">Detail</p>
                    <h3 className="section-title">{section.title}</h3>
                  </div>
                </div>
                <div className="stat-list">
                  {section.options.map((stat) => (
                    <div key={stat.key} className="stat-row">
                      <span>{stat.label}</span>
                      <div className="stat-actions">
                        <button type="button" onClick={() => updateStats(selectedHole, stat.key, -1)}>
                          -
                        </button>
                        <strong>{Number(holeStats[stat.key] || 0)}</strong>
                        <button type="button" onClick={() => updateStats(selectedHole, stat.key, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="manual-save-row hole-save-row track-save-row">
            <button
              className="save-btn"
              onClick={saveCurrentRound}
              disabled={!selectedRoundId || saveState === 'saving' || saveState === 'loading'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save hole'}
            </button>
            <button
              type="button"
              onClick={saveAndNextHole}
              disabled={!selectedRoundId || saveState === 'saving' || saveState === 'loading'}
            >
              Next hole
            </button>
          </section>
        </div>

        <aside className="track-secondary-column">
          {showDistanceTracker ? (
            <section className="distance-tracker active-panel track-shot-panel">
            <div className="card-header close-header">
              <div>
                <p className="section-kicker">Shot tracker</p>
                <h3 className="section-title">Track distance</h3>
              </div>
              <button type="button" className="icon-close-btn" aria-label="Close track distance" onClick={closeDistancePanel}>
                ×
              </button>
            </div>
            <div className="prototype-block">
              <h3 className="section-title">Club</h3>
              <div className="club-groups" role="group" aria-label="Club selection">
                {CLUB_GROUPS.map((group) => (
                  <div key={group.label} className="club-group">
                    <h4 className="club-group-title">{group.label}</h4>
                    <div className="club-row">
                      {group.options.map((club) => (
                        <button
                          key={club}
                          className={clubSelection === club ? 'club-btn active' : 'club-btn'}
                          onClick={() => setClubSelection((prev) => (prev === club ? '' : club))}
                        >
                          {club}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="prototype-block">
              <h3 className="section-title">Lie</h3>
              <div className="club-row" role="group" aria-label="Lie selection">
                {LIE_OPTIONS.map((lie) => (
                  <button
                    key={lie}
                    className={lieSelection === lie ? 'club-btn active' : 'club-btn'}
                    onClick={() => setLieSelection((prev) => (prev === lie ? '' : lie))}
                  >
                    {lie}
                  </button>
                ))}
              </div>
            </div>

            <div className="prototype-block">
              <h3 className="section-title">Actual distance</h3>
              <div className="unit-toggle" role="group" aria-label="Actual distance unit">
                <button
                  type="button"
                  className={actualDistanceUnit === 'meters' ? 'club-btn active' : 'club-btn'}
                  onClick={() => {
                    setActualDistanceUnit('meters');
                    setActualDistanceMeters(pacesToMeters(actualDistancePaces));
                  }}
                >
                  Meters
                </button>
                <button
                  type="button"
                  className={actualDistanceUnit === 'paces' ? 'club-btn active' : 'club-btn'}
                  onClick={() => {
                    setActualDistanceUnit('paces');
                    setActualDistancePaces(metersToPaces(actualDistanceMeters));
                  }}
                >
                  Paces
                </button>
              </div>
              {actualDistanceUnit === 'meters' ? (
                <>
                  <div className="distance-header">
                    <span />
                    <div className="distance-value-actions">
                      <button type="button" onClick={() => adjustActualDistanceMeters(-1)} aria-label="Decrease meters">
                        -
                      </button>
                      <strong>{actualDistanceMeters}m</strong>
                      <button type="button" onClick={() => adjustActualDistanceMeters(1)} aria-label="Increase meters">
                        +
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={1}
                    value={actualDistanceMeters}
                    onChange={(event) => setActualDistanceMeters(Number(event.target.value))}
                  />
                </>
              ) : (
                <>
                  <div className="distance-header">
                    <span />
                    <div className="distance-value-actions">
                      <button type="button" onClick={() => adjustActualDistancePaces(-1)} aria-label="Decrease paces">
                        -
                      </button>
                      <strong>{actualDistancePaces}</strong>
                      <button type="button" onClick={() => adjustActualDistancePaces(1)} aria-label="Increase paces">
                        +
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={metersToPaces(10)}
                    max={metersToPaces(300)}
                    step={1}
                    value={actualDistancePaces}
                    onChange={(event) => setActualDistancePaces(Number(event.target.value))}
                  />
                </>
              )}
            </div>

            <div className="distance-options-toggle">
              <button type="button" className="setup-toggle" onClick={() => setShowAdvancedDistanceOptions((prev) => !prev)}>
                {showAdvancedDistanceOptions ? 'Hide more options' : 'More options'}
              </button>
            </div>

            {showAdvancedDistanceOptions ? (
              <div className="distance-advanced">
                <div className="prototype-block">
                  <h3 className="section-title">Target distance</h3>
                  <div className="distance-header">
                    <span>Distance</span>
                    <strong>{targetDistanceMeters === 0 ? 'Off' : `${targetDistanceMeters}m`}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={1}
                    value={targetDistanceMeters}
                    onChange={(event) => setTargetDistanceMeters(Number(event.target.value))}
                  />
                </div>

                <div className="prototype-block">
                  <h3 className="section-title">Offline</h3>
                  <div className="distance-header">
                    <span>Direction</span>
                    <strong>
                      {offlineMeters == null
                        ? 'Off'
                        : offlineMeters === 0
                          ? 'On line'
                          : `${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`}
                    </strong>
                  </div>
                  <div className="offline-grid" role="group" aria-label="Offline distance">
                    <div className="offline-column">
                      {LEFT_OFFLINE_OPTIONS.map((value) => {
                        const label = `${Math.abs(value) === 15 ? '15m +' : `${Math.abs(value)}m`} L`;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={offlineMeters === value ? 'club-btn offline-btn active' : 'club-btn offline-btn'}
                            onClick={() => setOfflineMeters(value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="offline-center">
                      <button
                        type="button"
                        className={offlineMeters === 0 ? 'club-btn offline-btn active' : 'club-btn offline-btn'}
                        onClick={() => setOfflineMeters(offlineMeters === 0 ? null : 0)}
                      >
                        On line
                      </button>
                    </div>
                    <div className="offline-column">
                      {RIGHT_OFFLINE_OPTIONS.map((value) => {
                        const label = `${Math.abs(value) === 15 ? '15m +' : `${Math.abs(value)}m`} R`;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={offlineMeters === value ? 'club-btn offline-btn active' : 'club-btn offline-btn'}
                            onClick={() => setOfflineMeters(value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="prototype-block">
                  <h3 className="section-title">Setup notes</h3>
                  <div className="quick-notes-row" role="group" aria-label="Setup note buttons">
                    {SHOT_SETUP_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        className={setupSelection === option.key ? 'quick-note-btn active' : 'quick-note-btn'}
                        onClick={() => toggleSetupSelection(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="prototype-block">
                  <h3 className="section-title">Clock system</h3>
                  <div className="clock-row" role="group" aria-label="Swing clock">
                    {SWING_CLOCK_OPTIONS.map((clock) => (
                      <button
                        key={clock}
                        className={swingClock === clock ? 'clock-btn active' : 'clock-btn'}
                        onClick={() => setSwingClock((prev) => (prev === clock ? '' : clock))}
                      >
                        {clock}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="manual-save-row">
              <button className="save-btn" onClick={addShotPrototypeNote}>
                Save distance
              </button>
            </div>
            {shotLogSaveState !== 'idle' ? <p className="hint">Shot log save: {shotLogSaveState}</p> : null}
          </section>
          ) : (
            <section className="card track-shot-placeholder" aria-label="shot tracker preview">
              <p className="section-kicker">Shot tracker</p>
              <h3 className="section-title">Ready for the next strike</h3>
              <p className="hint">
                Open the tracker when you want to store club choice, lie, actual yardage, dispersion, and setup cues.
              </p>
              <div className="shot-placeholder-grid">
                <div className="placeholder-stat">
                  <span>Club</span>
                  <strong>{clubSelection || 'Not set'}</strong>
                </div>
                <div className="placeholder-stat">
                  <span>Lie</span>
                  <strong>{lieSelection || 'Not set'}</strong>
                </div>
                <div className="placeholder-stat">
                  <span>Distance</span>
                  <strong>{actualDistanceUnit === 'meters' ? `${actualDistanceMeters}m` : `${actualDistancePaces} paces`}</strong>
                </div>
                <div className="placeholder-stat">
                  <span>Clock</span>
                  <strong>{swingClock || 'Not set'}</strong>
                </div>
              </div>
              <button
                type="button"
                className="save-btn shot-launch-btn"
                onClick={() => {
                  setShowAdvancedDistanceOptions(false);
                  setShowDistanceTracker(true);
                  setDistanceMode('setup');
                }}
              >
                Open shot tracker
              </button>
            </section>
          )}
        </aside>
      </section>
    </>
  );
}
