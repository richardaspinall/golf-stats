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
import type { HoleStats, RoundListItem } from '../../types';

const OFFLINE_OPTIONS = [-15, -10, -5, 0, 5, 10, 15];

type TrackPageProps = {
  round: {
    selectedHole: number;
    displayHoleIndex: number;
    displayHolePar: number | null;
    activeRound?: RoundListItem;
    holeStats: HoleStats;
    selectedRoundId: string;
    saveState: string;
  };
  distance: {
    showDistanceTracker: boolean;
    targetDistanceMeters: number;
    actualDistanceUnit: string;
    actualDistanceMeters: number;
    actualDistancePaces: number;
    offlineMeters: number;
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
    setOfflineMeters: (value: number) => void;
    setClubSelection: (value: string | ((prev: string) => string)) => void;
    setLieSelection: (value: string | ((prev: string) => string)) => void;
    toggleSetupSelection: (setupKey: string) => void;
    setSwingClock: (value: string | ((prev: string) => string)) => void;
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
  const { selectedHole, displayHoleIndex, displayHolePar, activeRound, holeStats, selectedRoundId, saveState } = round;
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
    addShotPrototypeNote,
    updateHoleScore,
    setFairwaySelection,
    updateStats,
    setGirSelection,
    saveCurrentRound,
    saveAndNextHole,
  } = actions;
  const { metersToPaces, pacesToMeters } = helpers;
  return (
    <>
      <HolePicker holes={HOLES} selectedHole={selectedHole} onSelect={setSelectedHole} />

      <section className="card" aria-label="hole stats">
        <div className="hole-header">
          <h2>Hole {selectedHole}</h2>
          <span className={holeIndexClass}>
            Index {displayHoleIndex} | Par {displayHolePar ?? '—'}
          </span>
        </div>
        <p className="hint">Round: {activeRound?.name || '...'}</p>
        <div className="track-distance-row">
          <button
            type="button"
            onClick={() => {
              setShowDistanceTracker(true);
              setDistanceMode('setup');
            }}
          >
            Track distance
          </button>
        </div>
        {showDistanceTracker ? (
          <div className="distance-tracker">
            <div className="prototype-block">
              <div className="distance-header">
                <span>Target distance</span>
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
                    <span>Meters</span>
                    <strong>{actualDistanceMeters}m</strong>
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
                    <span>Paces</span>
                    <strong>{actualDistancePaces}</strong>
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

            <div className="prototype-block">
              <div className="distance-header">
                <span>Offline</span>
                <strong>{offlineMeters === 0 ? 'Off' : `${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`}</strong>
              </div>
              <div className="club-row" role="group" aria-label="Offline distance">
                {OFFLINE_OPTIONS.map((value) => {
                  const magnitudeLabel = Math.abs(value) === 15 ? '15m +' : `${Math.abs(value)}m`;
                  const label = value === 0 ? 'On line' : `${magnitudeLabel} ${value < 0 ? 'L' : 'R'}`;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={offlineMeters === value ? 'club-btn active' : 'club-btn'}
                      onClick={() => setOfflineMeters(value)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
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

            <div className="manual-save-row">
              <button className="save-btn" onClick={addShotPrototypeNote}>
                Save distance
              </button>
            </div>
            {shotLogSaveState !== 'idle' ? <p className="hint">Shot log save: {shotLogSaveState}</p> : null}
          </div>
        ) : null}
        <div className="stat-section">
          <h3 className="section-title">Hole details</h3>
          <div className="stat-list">
            <div className="stat-row">
              <span>Score</span>
              <div className="stat-actions">
                <button onClick={() => updateHoleScore(selectedHole, -1)}>-</button>
                <strong>{holeStats.score}</strong>
                <button onClick={() => updateHoleScore(selectedHole, 1)}>+</button>
              </div>
            </div>
          </div>
        </div>
        <div className="stat-section-list">
          <div className="stat-section">
            <h3 className="section-title">{FAIRWAY_SECTION.title}</h3>
            <div className="fairway-menu" role="group" aria-label="Fairway direction">
              {FAIRWAY_SECTION.options.map((option) => (
                <button
                  key={option.key}
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
          </div>

          {OOP_COUNTER_SECTION ? (
            <div className="stat-section">
              <h3 className="section-title">{OOP_COUNTER_SECTION.title}</h3>
              <div className="stat-list">
                {OOP_COUNTER_SECTION.options.map((stat) => (
                  <div key={stat.key} className="stat-row">
                    <span>{stat.label}</span>
                    <div className="stat-actions">
                      <button onClick={() => updateStats(selectedHole, stat.key, -1)}>-</button>
                      <strong>{Number(holeStats[stat.key] || 0)}</strong>
                      <button onClick={() => updateStats(selectedHole, stat.key, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="stat-section">
            <h3 className="section-title">{GIR_SECTION.title}</h3>
            <div className="gir-menu" role="group" aria-label="GIR direction">
              {GIR_SECTION.options.map((option) => (
                <button
                  key={option.key}
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
          </div>

          {NON_OOP_COUNTER_SECTIONS.filter((section) =>
            section.title === 'Inside 100 (Over 3 within 100m score)'
              ? ['girLeft', 'girRight', 'girLong', 'girShort'].includes(String(holeStats.girSelection))
              : true,
          ).map((section) => (
            <div key={section.title} className="stat-section">
              <h3 className="section-title">{section.title}</h3>
              <div className="stat-list">
                {section.options.map((stat) => (
                  <div key={stat.key} className="stat-row">
                    <span>{stat.label}</span>
                    <div className="stat-actions">
                      <button onClick={() => updateStats(selectedHole, stat.key, -1)}>-</button>
                      <strong>{Number(holeStats[stat.key] || 0)}</strong>
                      <button onClick={() => updateStats(selectedHole, stat.key, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="manual-save-row hole-save-row">
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
        </div>
      </section>
    </>
  );
}
