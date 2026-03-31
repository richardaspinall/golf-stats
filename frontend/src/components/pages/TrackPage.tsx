import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

import { HolePicker } from '../HolePicker';
import {
  CLUB_GROUPS,
  FAIRWAY_SECTION,
  GIR_EXTRA_OPTIONS,
  GIR_SECTION,
  HOLES,
  LIE_OPTIONS,
  NON_OOP_COUNTER_SECTIONS,
  OOP_COUNTER_SECTION,
  SHOT_SETUP_OPTIONS,
  SWING_CLOCK_OPTIONS,
} from '../../lib/constants';
import type { Course, HoleStats, RoundListItem, StatsByHole } from '../../types';

const LEFT_OFFLINE_OPTIONS = [-5, -10, -15];
const RIGHT_OFFLINE_OPTIONS = [5, 10, 15];
const METER_PRESETS = [30, 50, 75, 100, 125, 150, 175, 200];
const TARGET_PRESETS = [0, 80, 100, 120, 140, 160];

type TrackPageProps = {
  round: {
    selectedHole: number;
    displayHoleIndex: number;
    displayHolePar: number | null;
    activeRound?: RoundListItem;
    activeCourse?: Course;
    holeStats: HoleStats;
    statsByHole: StatsByHole;
    selectedRoundId: string;
    saveState: string;
    isTrackMapOpen: boolean;
    teeToGreenMeters: number | null;
    mapStatusLabel: string;
    rotationSupportLabel: string;
    mapDebugInfo: unknown;
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
    saveCurrentRound: () => Promise<boolean>;
    saveAndNextHole: () => void;
    setIsTrackMapOpen: (value: boolean) => void;
  };
  map: {
    googleMapsMapId: string;
    googleMapsApiKey: string;
    mapContainerRef: RefObject<HTMLDivElement | null>;
  };
  helpers: {
    metersToPaces: (meters: number) => number;
    pacesToMeters: (paces: number) => number;
  };
};

export function TrackPage({ round, distance, actions, map, helpers }: TrackPageProps) {
  const [showAdvancedDistanceOptions, setShowAdvancedDistanceOptions] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [holeHeadingFlash, setHoleHeadingFlash] = useState(false);
  const [isTrackMapMenuOpen, setIsTrackMapMenuOpen] = useState(false);
  const {
    selectedHole,
    displayHoleIndex,
    displayHolePar,
    activeRound,
    activeCourse,
    holeStats,
    statsByHole,
    selectedRoundId,
    saveState,
    isTrackMapOpen,
    teeToGreenMeters,
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
    setIsTrackMapOpen,
  } = actions;
  const { mapContainerRef } = map;
  const { metersToPaces, pacesToMeters } = helpers;
  const holeMarkers = activeCourse?.markers?.[selectedHole];
  const hasHoleMap = Boolean(holeMarkers?.teePosition || holeMarkers?.greenPosition);
  const scorePresetValues = Array.from(
    new Set(
      [Math.max(1, (displayHolePar ?? 4) - 2), Math.max(1, (displayHolePar ?? 4) - 1), displayHolePar ?? 4, (displayHolePar ?? 4) + 1, (displayHolePar ?? 4) + 2].filter(
        (value) => value > 0,
      ),
    ),
  );
  const pacesPresets = METER_PRESETS.map((meters) => metersToPaces(meters));
  const quickFairwayOptions = [...FAIRWAY_SECTION.options].sort((a, b) => {
    const order = ['fairwayHit', 'fairwayLeft', 'fairwayRight', 'fairwayLong', 'fairwayShort'];
    return order.indexOf(a.key) - order.indexOf(b.key);
  });
  const quickGirOptions = [...GIR_SECTION.options].sort((a, b) => {
    const order = ['girHit', 'girLeft', 'girRight', 'girLong', 'girShort'];
    return order.indexOf(a.key) - order.indexOf(b.key);
  });

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
  const setHoleScoreValue = (nextScore: number) => {
    updateHoleScore(selectedHole, nextScore - holeStats.score);
  };
  const getScorePresetLabel = (value: number) => {
    const par = displayHolePar ?? 4;
    const diff = value - par;
    if (diff <= -2) return 'Eagle+';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    return 'Double+';
  };
  const setCounterValue = (statKey: string, nextValue: number) => {
    updateStats(selectedHole, statKey, nextValue - Number(holeStats[statKey] || 0));
  };
  const toggleCustomCounterInput = (statKey: string) => {
    const currentValue = Number(holeStats[statKey] || 0);
    if (currentValue >= 4) {
      setCounterValue(statKey, Math.max(4, currentValue + 1));
      return;
    }

    setCounterValue(statKey, 4);
  };
  const handleSelectHole = async (hole: number) => {
    if (hole === selectedHole || saveState === 'saving' || saveState === 'loading') {
      return;
    }

    if (saveState === 'unsaved') {
      const didSave = await saveCurrentRound();
      if (!didSave) {
        return;
      }
    }

    setSelectedHole(hole);
  };

  useEffect(() => {
    setHoleHeadingFlash(true);
    const timeoutId = window.setTimeout(() => setHoleHeadingFlash(false), 900);
    return () => window.clearTimeout(timeoutId);
  }, [selectedHole]);

  useEffect(() => {
    setIsTrackMapMenuOpen(false);
  }, [selectedHole, isTrackMapOpen]);

  return (
    <>
      <HolePicker
        holes={HOLES}
        selectedHole={selectedHole}
        roundName={activeRound?.name}
        holeScores={Object.fromEntries(HOLES.map((hole) => [hole, Number(statsByHole[hole]?.score || 0)]))}
        selectedHoleMeta={{
          holeIndex: displayHoleIndex,
          par: displayHolePar,
          distanceMeters: teeToGreenMeters,
        }}
        onSelect={handleSelectHole}
      />

      <section className="card" aria-label="hole stats">
        <>
            <div className="stat-section">
              <h3 className="section-title">Hole details</h3>
              <div className="hole-header">
                <div className={holeHeadingFlash ? 'hole-badge hole-heading-flash' : 'hole-badge'}>
                  <span className="hole-badge-label">Hole</span>
                  <strong>{selectedHole}</strong>
                </div>
                <span className={holeHeadingFlash ? `${holeIndexClass} hole-meta-flash` : holeIndexClass}>
                  Index {displayHoleIndex} | Par {displayHolePar ?? '—'}
                </span>
              </div>
              <div className="track-hole-actions">
                <button type="button" onClick={() => setIsTrackMapOpen(!isTrackMapOpen)} disabled={!activeCourse}>
                  {isTrackMapOpen ? 'Hide map' : 'Show map'}
                </button>
                <p className="hint">
                  {!activeCourse
                    ? 'No course selected for this round.'
                    : hasHoleMap
                      ? 'Saved hole markers are available.'
                      : 'No tee or green markers saved for this hole yet.'}
                </p>
              </div>
              {isTrackMapOpen ? (
                <div className="track-hole-map active-panel">
                  <div className="map-header">
                    <div>
                      <h4 className="section-title">Hole map</h4>
                    </div>
                    <button type="button" className="icon-close-btn" aria-label="Close hole map" onClick={() => setIsTrackMapOpen(false)}>
                      ×
                    </button>
                  </div>
                  {!hasHoleMap ? <p className="hint">Add the hole markers on the courses page to frame this hole automatically.</p> : null}
                  <div className="map-shell">
                    <div ref={mapContainerRef} className="map-canvas" />
                    <div className="track-score-overlay">
                      {teeToGreenMeters != null ? <div className="track-map-distance-pill">{teeToGreenMeters}m to green</div> : null}
                      <div className="track-map-hole-nav">
                        <button
                          type="button"
                          className="track-map-hole-nav-btn"
                          aria-label="Previous hole"
                          onClick={() => void handleSelectHole(selectedHole <= 1 ? HOLES[HOLES.length - 1] : selectedHole - 1)}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className={isTrackMapMenuOpen ? 'track-map-hole-trigger active' : 'track-map-hole-trigger'}
                          aria-expanded={isTrackMapMenuOpen}
                          aria-label={`Open hole ${selectedHole} menu`}
                          onClick={() => setIsTrackMapMenuOpen((prev) => !prev)}
                        >
                          <span className="track-map-hole-trigger-label">Hole</span>
                          <strong>{selectedHole}</strong>
                        </button>
                        <button
                          type="button"
                          className="track-map-hole-nav-btn"
                          aria-label="Next hole"
                          onClick={() => void handleSelectHole(selectedHole >= HOLES.length ? HOLES[0] : selectedHole + 1)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                    {isTrackMapMenuOpen ? (
                      <div className="track-map-menu-sheet">
                        <div className="track-map-menu-header">
                          <div>
                            <p className="track-map-menu-kicker">Hole {selectedHole}</p>
                            <h4 className="section-title">Hole menu</h4>
                          </div>
                          <button
                            type="button"
                            className="icon-close-btn"
                            aria-label="Close hole menu"
                            onClick={() => setIsTrackMapMenuOpen(false)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="track-map-menu-section">
                          <div className="stat-row">
                            <span>Score</span>
                            <div className="stat-actions">
                              <button type="button" onClick={() => updateHoleScore(selectedHole, -1)} aria-label="Decrease score">
                                -
                              </button>
                              <strong>{holeStats.score}</strong>
                              <button type="button" onClick={() => updateHoleScore(selectedHole, 1)} aria-label="Increase score">
                                +
                              </button>
                            </div>
                          </div>
                          <div className="score-preset-grid track-score-preset-grid" role="group" aria-label="Score presets">
                            {scorePresetValues.map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={holeStats.score === value ? 'score-preset active' : 'score-preset'}
                                onClick={() => setHoleScoreValue(value)}
                              >
                                <strong>{value}</strong>
                                <span>{getScorePresetLabel(value)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="track-map-menu-section">
                          <span className="quick-select-label">Fairway</span>
                          <div className="quick-select-row" role="group" aria-label="Quick fairway selection">
                            {quickFairwayOptions.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={holeStats.fairwaySelection === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setFairwaySelection(selectedHole, option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="track-map-menu-section">
                          <span className="quick-select-label">GIR</span>
                          <div className="quick-select-row" role="group" aria-label="Quick GIR selection">
                            {[...quickGirOptions, ...GIR_EXTRA_OPTIONS].map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={holeStats.girSelection === option.key ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setGirSelection(selectedHole, option.key)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="track-map-menu-section">
                          <span className="quick-select-label">Putts</span>
                          <div className="quick-select-row" role="group" aria-label="Quick putts selection">
                            {[0, 1, 2, 3, 4].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={Number(holeStats.totalPutts || 0) === value ? 'choice-chip active' : 'choice-chip'}
                                onClick={() => setCounterValue('totalPutts', value)}
                              >
                                {value === 4 ? '4+' : value}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {!isTrackMapOpen ? (
                <>
                  <div className="stat-list">
                    <div className="stat-row">
                      <span>Score</span>
                      <div className="stat-actions">
                        <button type="button" onClick={() => updateHoleScore(selectedHole, -1)}>-</button>
                        <strong>{holeStats.score}</strong>
                        <button type="button" onClick={() => updateHoleScore(selectedHole, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                  <div className="score-preset-grid" role="group" aria-label="Score presets">
                    {scorePresetValues.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={holeStats.score === value ? 'score-preset active' : 'score-preset'}
                        onClick={() => setHoleScoreValue(value)}
                      >
                        <strong>{value}</strong>
                        <span>{getScorePresetLabel(value)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="score-quick-selects">
                    <div className="quick-select-group">
                      <span className="quick-select-label">Fairway</span>
                      <div className="quick-select-row" role="group" aria-label="Quick fairway selection">
                        {quickFairwayOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            className={holeStats.fairwaySelection === option.key ? 'choice-chip active' : 'choice-chip'}
                            onClick={() => setFairwaySelection(selectedHole, option.key)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="quick-select-group">
                      <span className="quick-select-label">GIR</span>
                      <div className="quick-select-row" role="group" aria-label="Quick GIR selection">
                        {[...quickGirOptions, ...GIR_EXTRA_OPTIONS].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            className={holeStats.girSelection === option.key ? 'choice-chip active' : 'choice-chip'}
                            onClick={() => setGirSelection(selectedHole, option.key)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="quick-select-group">
                      <span className="quick-select-label">Putts</span>
                      <div className="quick-select-row" role="group" aria-label="Quick putts selection">
                        {[0, 1, 2, 3, 4].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={Number(holeStats.totalPutts || 0) === value ? 'choice-chip active' : 'choice-chip'}
                            onClick={() => setCounterValue('totalPutts', value)}
                          >
                            {value === 4 ? '4+' : value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              <div className="detail-options-toggle">
                <button type="button" className="setup-toggle detail-options-button" onClick={() => setShowDetailedStats((prev) => !prev)}>
                  {showDetailedStats ? 'Hide detailed stats' : 'Show detailed stats'}
                </button>
              </div>
              {!showDetailedStats ? (
                <div className="track-distance-section">
                  <h4 className="section-title">Track distance</h4>
                  <p className="hint">Open the distance tracker to log club, lie, distance and setup details.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedDistanceOptions(false);
                      setShowDistanceTracker(true);
                      setDistanceMode('setup');
                    }}
                  >
                    Track distance
                  </button>
                </div>
              ) : null}
            </div>
            {!isTrackMapOpen && showDetailedStats ? (
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
                      <div key={stat.key} className="counter-tile">
                        <div className="counter-tile-header">
                          <span>{stat.label}</span>
                          <div className="counter-value-grid" role="group" aria-label={`${stat.label} value`}>
                            <button
                              type="button"
                              className={Number(holeStats[stat.key] || 0) === 0 ? 'counter-value-btn counter-reset-btn active' : 'counter-value-btn counter-reset-btn'}
                              onClick={() => setCounterValue(stat.key, 0)}
                            >
                              0
                            </button>
                            {[1, 2, 3].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={Number(holeStats[stat.key] || 0) === value ? 'counter-value-btn active' : 'counter-value-btn'}
                                onClick={() => setCounterValue(stat.key, value)}
                              >
                                {value}
                              </button>
                            ))}
                            <button
                              type="button"
                              className={Number(holeStats[stat.key] || 0) >= 4 ? 'counter-value-btn active' : 'counter-value-btn'}
                              onClick={() => toggleCustomCounterInput(stat.key)}
                              aria-expanded={Number(holeStats[stat.key] || 0) >= 4}
                              aria-label={`Enter a custom value for ${stat.label}`}
                            >
                              +
                            </button>
                            {Number(holeStats[stat.key] || 0) >= 4 ? (
                              <button
                                type="button"
                                className="counter-inline-value"
                                onClick={() => setCounterValue(stat.key, Math.max(4, Number(holeStats[stat.key] || 4) - 1))}
                                aria-label={`Decrease custom value for ${stat.label}`}
                              >
                                {Math.max(4, Number(holeStats[stat.key] || 4))}
                              </button>
                            ) : null}
                          </div>
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
                  <div className="gir-extra-row" role="group" aria-label="Additional GIR options">
                    {GIR_EXTRA_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={holeStats.girSelection === option.key ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => setGirSelection(selectedHole, option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {NON_OOP_COUNTER_SECTIONS.filter((section) => {
                  const shouldShowInside100 =
                    ['girLeft', 'girRight', 'girLong', 'girShort', 'girNoChance'].includes(String(holeStats.girSelection));
                  return section.title === 'Inside 100 (Over 3 within 100m score)' || section.title === 'Up & Down'
                    ? shouldShowInside100
                    : true;
                }).map((section) => (
                  <div key={section.title} className="stat-section">
                    <h3 className="section-title">{section.title}</h3>
                    <div className="stat-list">
                      {section.options.map((stat) => (
                        <div key={stat.key} className="counter-tile">
                          <div className="counter-tile-header">
                            <span>{stat.label}</span>
                            <div className="counter-value-grid" role="group" aria-label={`${stat.label} value`}>
                              <button
                                type="button"
                                className={Number(holeStats[stat.key] || 0) === 0 ? 'counter-value-btn counter-reset-btn active' : 'counter-value-btn counter-reset-btn'}
                                onClick={() => setCounterValue(stat.key, 0)}
                              >
                                0
                              </button>
                              {[1, 2, 3].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={Number(holeStats[stat.key] || 0) === value ? 'counter-value-btn active' : 'counter-value-btn'}
                                  onClick={() => setCounterValue(stat.key, value)}
                                >
                                  {value}
                                </button>
                              ))}
                              <button
                                type="button"
                                className={Number(holeStats[stat.key] || 0) >= 4 ? 'counter-value-btn active' : 'counter-value-btn'}
                                onClick={() => toggleCustomCounterInput(stat.key)}
                                aria-expanded={Number(holeStats[stat.key] || 0) >= 4}
                                aria-label={`Enter a custom value for ${stat.label}`}
                              >
                                +
                              </button>
                              {Number(holeStats[stat.key] || 0) >= 4 ? (
                                <button
                                  type="button"
                                  className="counter-inline-value"
                                  onClick={() => setCounterValue(stat.key, Math.max(4, Number(holeStats[stat.key] || 4) - 1))}
                                  aria-label={`Decrease custom value for ${stat.label}`}
                                >
                                  {Math.max(4, Number(holeStats[stat.key] || 4))}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {!isTrackMapOpen && showDetailedStats ? (
              <div className="track-distance-section">
                <h4 className="section-title">Track distance</h4>
                <p className="hint">Open the distance tracker to log club, lie, distance and setup details.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedDistanceOptions(false);
                    setShowDistanceTracker(true);
                    setDistanceMode('setup');
                  }}
                >
                  Track distance
                </button>
              </div>
            ) : null}
            {!isTrackMapOpen && saveState === 'unsaved' ? (
              <div className="manual-save-row hole-save-row hole-save-row-has-mobile-tray">
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
                  Save & next
                </button>
              </div>
            ) : null}
          {showDistanceTracker ? (
            <div className="distance-tracker active-panel">
              <div className="card-header close-header">
                <h3 className="section-title">Track distance</h3>
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
                            type="button"
                            key={club}
                            className={clubSelection === club ? 'choice-chip active' : 'choice-chip'}
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
                      type="button"
                      key={lie}
                      className={lieSelection === lie ? 'choice-chip active' : 'choice-chip'}
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
                    className={actualDistanceUnit === 'meters' ? 'choice-chip active' : 'choice-chip'}
                    onClick={() => {
                      setActualDistanceUnit('meters');
                      setActualDistanceMeters(pacesToMeters(actualDistancePaces));
                    }}
                  >
                    Meters
                  </button>
                  <button
                    type="button"
                    className={actualDistanceUnit === 'paces' ? 'choice-chip active' : 'choice-chip'}
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
                    <div className="preset-row" role="group" aria-label="Meter presets">
                      {METER_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={actualDistanceMeters === preset ? 'choice-chip active' : 'choice-chip'}
                          onClick={() => setActualDistanceMeters(preset)}
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                    <div className="distance-header">
                      <span>Distance</span>
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
                    <div className="preset-row" role="group" aria-label="Pace presets">
                      {pacesPresets.map((preset, index) => (
                        <button
                          key={`${preset}-${index}`}
                          type="button"
                          className={actualDistancePaces === preset ? 'choice-chip active' : 'choice-chip'}
                          onClick={() => setActualDistancePaces(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="distance-header">
                      <span>Distance</span>
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
                    <div className="preset-row" role="group" aria-label="Target distance presets">
                      {TARGET_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={targetDistanceMeters === preset ? 'choice-chip active' : 'choice-chip'}
                          onClick={() => setTargetDistanceMeters(preset)}
                        >
                          {preset === 0 ? 'Off' : `${preset}m`}
                        </button>
                      ))}
                    </div>
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
                              className={offlineMeters === value ? 'choice-chip offline-btn active' : 'choice-chip offline-btn'}
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
                          className={offlineMeters === 0 ? 'choice-chip offline-btn active' : 'choice-chip offline-btn'}
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
                              className={offlineMeters === value ? 'choice-chip offline-btn active' : 'choice-chip offline-btn'}
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
                          type="button"
                          key={option.key}
                          className={setupSelection === option.key ? 'choice-chip active' : 'choice-chip'}
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
                          type="button"
                          key={clock}
                          className={swingClock === clock ? 'choice-chip active' : 'choice-chip'}
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
            </div>
          ) : null}
        </>
      </section>

      {saveState === 'unsaved' ? (
        <div className="mobile-save-tray" aria-label="save actions">
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
            Save & next
          </button>
        </div>
      ) : null}
    </>
  );
}
