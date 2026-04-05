import { useState } from 'react';
import type { ReactNode } from 'react';

import { PENALTY_STROKE_OPTIONS, PUTT_COUNT_OPTIONS, PUTTING_DETAIL_OPTIONS } from '../constants';
import { clampPreviousShotDistanceAdjustmentMeters, getOutcomePositionClass, getRecordedDistanceFromFollowingShot } from '../domain/planner';
import type { PlannerShot, VirtualCaddyState } from '../types';

type ExecuteStepProps = {
  state: VirtualCaddyState;
  shotNumber: number;
  editingIndex: number | null;
  isPutting: boolean;
  isChipping: boolean;
  isWedgeMatrixChip: boolean;
  recommendation: {
    club: string;
    carryMeters: number;
    effectiveDistanceMeters: number;
    reasons: string[];
    source: string;
    wedgeMatrixId: number | null;
    swingClock: string | null;
    wedgeMatrixName: string | null;
    wedgeMatrixSetup: string | null;
  };
  baseRecommendationClub: string | undefined;
  visibleOverrideClubs: Array<{ club: string; carry: number }>;
  canShowAllOverrideClubs: boolean;
  canOverrideClub: boolean;
  canOverrideOutcomeMode: boolean;
  outcomeMode: 'fairway' | 'gir';
  outcomeOptions: Array<{ key: string; label: string }>;
  useCompassResultLayout: boolean;
  canSaveShot: boolean;
  isSavingShot: boolean;
  shotDistanceBannerLabel: string;
  shotDistanceBannerValue: string | null;
  headerActions?: ReactNode;
  onCancelEdit: () => void;
  onBack: (() => void) | null;
  onSave: () => void;
  onOpenWedgeMatrix?: (matrixId: number | null) => void;
  onPatch: (patch: Partial<VirtualCaddyState>) => void;
  onSelectClub: (club: string | null) => void;
  onToggleOutcomeMode: () => void;
  onSetPuttCount: (count: number | null) => void;
  onSetPuttDetail: (key: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m', value: number) => void;
  onSetOutcomeSelection: (value: string) => void;
  onSetPenaltyStrokes: (value: number) => void;
};

export function ExecuteStep({
  state,
  shotNumber,
  editingIndex,
  isPutting,
  isChipping,
  isWedgeMatrixChip,
  recommendation,
  baseRecommendationClub,
  visibleOverrideClubs,
  canShowAllOverrideClubs,
  canOverrideClub,
  canOverrideOutcomeMode,
  outcomeMode,
  outcomeOptions,
  useCompassResultLayout,
  canSaveShot,
  isSavingShot,
  shotDistanceBannerLabel,
  shotDistanceBannerValue,
  headerActions,
  onCancelEdit,
  onBack,
  onSave,
  onOpenWedgeMatrix,
  onPatch,
  onSelectClub,
  onToggleOutcomeMode,
  onSetPuttCount,
  onSetPuttDetail,
  onSetOutcomeSelection,
  onSetPenaltyStrokes,
}: ExecuteStepProps) {
  const firstPuttDistanceMeters = Math.max(0, Math.round(state.firstPuttDistanceMeters ?? 0));
  const firstPuttDistanceLabel = firstPuttDistanceMeters > 0 ? `${firstPuttDistanceMeters}m` : 'Not set';
  const getPuttDetailValue = (statKey: 'puttMissLong' | 'puttMissShort' | 'puttMissWithin2m') => {
    if (statKey === 'puttMissLong') return state.puttMissLong;
    if (statKey === 'puttMissShort') return state.puttMissShort;
    return state.puttMissWithin2m;
  };
  const previousShot = isPutting || isChipping ? state.trail[state.trail.length - 1] ?? null : null;
  const canAdjustPuttingPreviousShotDistance =
    isPutting && previousShot != null && (previousShot.outcomeSelection === 'girHit' || previousShot.outcomeSelection === 'chipOnGreen');
  const canAdjustChipPreviousShotDistance =
    isChipping && previousShot != null && (previousShot.outcomeSelection === 'girLeft' || previousShot.outcomeSelection === 'girRight');
  const hasAutoLongChipRecovery = isChipping && previousShot?.outcomeSelection === 'girLong';
  const previousShotDistanceAdjustmentMeters = clampPreviousShotDistanceAdjustmentMeters(state.previousShotDistanceAdjustmentMeters);
  const showingChipFlagAdjustment = canAdjustChipPreviousShotDistance && state.previousShotUseFlagAdjustment;
  const canShowPreviousShotCard = canAdjustPuttingPreviousShotDistance || canAdjustChipPreviousShotDistance || hasAutoLongChipRecovery;
  const recordedPreviousShotDistanceMeters = previousShot
    ? getRecordedDistanceFromFollowingShot(previousShot, {
        actionType: state.actionType,
        distanceStartMeters: state.distanceToHoleMeters,
        previousShotDistanceAdjustmentMeters,
        previousShotUseFlagAdjustment: showingChipFlagAdjustment,
      })
    : null;
  const [showPreviousShotAdjustment, setShowPreviousShotAdjustment] = useState(false);

  return (
    <div className="virtual-caddy-step">
      <div className="virtual-caddy-step-header">
        <div className="virtual-caddy-step-title">
          <span className="virtual-caddy-step-number">{shotNumber}</span>
          <div>
            <h5>Execute</h5>
          </div>
        </div>
        <div className="virtual-caddy-step-header-actions">
          {headerActions}
          {editingIndex != null ? (
            <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={onCancelEdit}>
              ×
            </button>
          ) : null}
        </div>
      </div>
      <div className="virtual-caddy-overview-hero virtual-caddy-distance-hero">
        {shotDistanceBannerValue != null ? <span className="virtual-caddy-overview-kicker">{shotDistanceBannerLabel}</span> : null}
        <strong>{shotDistanceBannerValue ?? shotDistanceBannerLabel}</strong>
      </div>
      {!isPutting && (!isChipping || isWedgeMatrixChip) && recommendation.effectiveDistanceMeters !== state.distanceToMiddleMeters ? (
        <div className="virtual-caddy-distance-summary">
          <div className="virtual-caddy-distance-summary-label">
            <span>Effective distance</span>
            <button type="button" className="virtual-caddy-inline-toggle-btn" onClick={() => onPatch({ showRecommendationWhy: !state.showRecommendationWhy })} aria-expanded={state.showRecommendationWhy}>
              {state.showRecommendationWhy ? 'Hide why' : 'Why'}
            </button>
          </div>
          <strong>{recommendation.effectiveDistanceMeters}m</strong>
        </div>
      ) : null}
      <div className="virtual-caddy-recommendation">
        <div className="virtual-caddy-recommendation-copy">
          <div className={isChipping ? 'virtual-caddy-club-row virtual-caddy-club-row-chip' : 'virtual-caddy-club-row'}>
            <div className="virtual-caddy-club-heading">
              <strong>
                <span className="virtual-caddy-club-line">
                  <span className="virtual-caddy-club-prefix">Club:</span>
                  {recommendation.club}
                  {!isPutting && (!isChipping || isWedgeMatrixChip) ? <span className="virtual-caddy-carry-inline">({recommendation.carryMeters}m carry)</span> : null}
                </span>
              </strong>
              <div className="virtual-caddy-club-actions">
                {canOverrideClub ? (
                  <button type="button" className="virtual-caddy-override-toggle" onClick={() => onPatch({ showClubOverride: !state.showClubOverride, showAllOverrideClubs: false })} aria-expanded={state.showClubOverride}>
                    {state.showClubOverride ? 'Hide override' : 'Override club'}
                  </button>
                ) : null}
              </div>
            </div>
            {canOverrideClub && state.selectedClub && state.selectedClub !== baseRecommendationClub ? (
              <div className="virtual-caddy-club-recommendation">Recommended: {baseRecommendationClub}</div>
            ) : null}
            {recommendation.source === 'wedgeMatrix' && recommendation.swingClock ? (
              <div className="virtual-caddy-distance-summary virtual-caddy-wedge-matrix-summary">
                <div className="virtual-caddy-distance-summary-label">
                  <span>Suggestion:</span>
                </div>
                <span className="virtual-caddy-wedge-matrix-summary-note">Swing: {recommendation.swingClock}</span>
                {recommendation.wedgeMatrixSetup ? <span className="virtual-caddy-wedge-matrix-summary-note">{recommendation.wedgeMatrixSetup}</span> : null}
                <div className="virtual-caddy-wedge-matrix-summary-source">
                  <strong className="virtual-caddy-wedge-matrix-summary-value">
                    {recommendation.wedgeMatrixName ?? 'Wedge matrix'}
                    <span className="virtual-caddy-wedge-matrix-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <path d="M9.5 5v14" />
                        <path d="M14.5 5v14" />
                        <path d="M4 10h16" />
                        <path d="M4 14h16" />
                      </svg>
                    </span>
                  </strong>
                  {onOpenWedgeMatrix ? (
                    <button
                      type="button"
                      className="virtual-caddy-inline-toggle-btn"
                      onClick={() => onOpenWedgeMatrix(recommendation.wedgeMatrixId)}
                    >
                      Open matrix
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="virtual-caddy-club-meta">
              {isPutting ? <span>Finish out</span> : null}
              {canOverrideClub && state.selectedClub && state.selectedClub !== baseRecommendationClub ? (
                <button type="button" className="virtual-caddy-recommended-reset" onClick={() => onSelectClub(null)}>
                  Reset to recommended
                </button>
              ) : null}
            </div>
          </div>
          {canOverrideClub && state.showClubOverride ? (
            <div className="virtual-caddy-club-picker">
              <div className="quick-select-row" role="group" aria-label="Virtual caddy club selection">
                {visibleOverrideClubs.map((entry) => (
                  <button key={entry.club} type="button" className={recommendation.club === entry.club ? 'choice-chip active' : 'choice-chip'} onClick={() => onSelectClub(entry.club === baseRecommendationClub ? null : entry.club)}>
                    {entry.club}
                  </button>
                ))}
              </div>
              {canShowAllOverrideClubs ? (
                <button type="button" className="setup-toggle" onClick={() => onPatch({ showAllOverrideClubs: true })}>
                  Show all clubs
                </button>
              ) : null}
            </div>
          ) : null}
          {!isPutting && (!isChipping || isWedgeMatrixChip) && state.showRecommendationWhy ? (
            <div className="prototype-block virtual-caddy-notes">
              <span className="quick-select-label">Why</span>
              <ul className="virtual-caddy-reason-list">
                {recommendation.reasons.length > 0 ? recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>Stock shot.</li>}
              </ul>
            </div>
          ) : null}
          {isPutting || isChipping ? (
            <>
              {canShowPreviousShotCard && previousShot && recordedPreviousShotDistanceMeters != null ? (
                <div className="prototype-block">
                  <div className="virtual-caddy-adjust-blurb">
                    <div className="virtual-caddy-adjust-blurb-copy">
                      <span className="quick-select-label">Previous shot vs flag</span>
                      {hasAutoLongChipRecovery ? (
                        <p className="hint">
                          Recorded {recordedPreviousShotDistanceMeters}m from a {previousShot.plannedDistanceMeters}m flag measurement because the miss finished {state.distanceToHoleMeters}m long.
                        </p>
                      ) : canAdjustChipPreviousShotDistance ? (
                        <p className="hint">
                          {showingChipFlagAdjustment
                            ? `Using the flag as the reference instead of the ${state.distanceToHoleMeters}m chip leave.`
                            : `Keeping the ${recordedPreviousShotDistanceMeters}m chip-based distance. Switch to flag adjustment if the miss was pin-high or long/short of the hole.`}
                        </p>
                      ) : (
                        <p className="hint">
                          Recorded {recordedPreviousShotDistanceMeters}m from a {previousShot.plannedDistanceMeters}m flag measurement.
                        </p>
                      )}
                    </div>
                    {canAdjustChipPreviousShotDistance ? (
                      <button
                        type="button"
                        className={showingChipFlagAdjustment ? 'setup-toggle active' : 'setup-toggle'}
                        onClick={() =>
                          onPatch({
                            previousShotUseFlagAdjustment: !showingChipFlagAdjustment,
                            previousShotDistanceAdjustmentMeters: 0,
                          })
                        }
                        aria-pressed={showingChipFlagAdjustment}
                      >
                        {showingChipFlagAdjustment ? 'Use chip distance' : 'Adjust to flag'}
                      </button>
                    ) : !hasAutoLongChipRecovery ? (
                      <button
                        type="button"
                        className="setup-toggle"
                        onClick={() => setShowPreviousShotAdjustment((value) => !value)}
                        aria-expanded={showPreviousShotAdjustment}
                      >
                        {showPreviousShotAdjustment ? 'Hide adjust' : 'Adjust'}
                      </button>
                    ) : null}
                  </div>
                  {(canAdjustPuttingPreviousShotDistance ? showPreviousShotAdjustment : showingChipFlagAdjustment) ? (
                    <>
                      <div className="distance-header">
                        <span className="quick-select-label">Adjustment</span>
                        <strong>{previousShotDistanceAdjustmentMeters > 0 ? `+${previousShotDistanceAdjustmentMeters}` : previousShotDistanceAdjustmentMeters}m</strong>
                      </div>
                      <p className="hint">Add for past pin, subtract for short.</p>
                      <div className="virtual-caddy-slider-stack">
                        <div className="virtual-caddy-slider-only-row">
                          <input
                            type="range"
                            min={-30}
                            max={30}
                            step={1}
                            value={previousShotDistanceAdjustmentMeters}
                            aria-label="Virtual caddy previous shot distance adjustment"
                            onChange={(event) => onPatch({ previousShotDistanceAdjustmentMeters: clampPreviousShotDistanceAdjustmentMeters(Number(event.target.value)) })}
                          />
                        </div>
                        <div className="virtual-caddy-slider-row">
                          {[-10, -5, -2, 2, 5, 10].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              className="choice-chip"
                              onClick={() =>
                                onPatch({
                                  previousShotDistanceAdjustmentMeters: clampPreviousShotDistanceAdjustmentMeters(previousShotDistanceAdjustmentMeters + delta),
                                })
                              }
                            >
                              {delta > 0 ? `+${delta}m` : `${delta}m`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="virtual-caddy-distance-summary">
                        <div className="virtual-caddy-distance-summary-label">
                          <span>Recorded previous shot</span>
                        </div>
                        <strong>{recordedPreviousShotDistanceMeters}m</strong>
                      </div>
                    </>
                  ) : hasAutoLongChipRecovery ? (
                    <div className="virtual-caddy-distance-summary">
                      <div className="virtual-caddy-distance-summary-label">
                        <span>Recorded previous shot</span>
                      </div>
                      <strong>{recordedPreviousShotDistanceMeters}m</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isPutting ? (
                <div className="prototype-block virtual-caddy-putting-distance-block">
                  <div className="distance-header">
                    <span className="quick-select-label">1st putt distance</span>
                    <strong>{firstPuttDistanceLabel}</strong>
                  </div>
                  <div className="virtual-caddy-slider-stack">
                    <div className="virtual-caddy-slider-only-row">
                      <input type="range" min={0} max={60} step={1} value={firstPuttDistanceMeters} aria-label="Virtual caddy first putt distance" onChange={(event) => onPatch({ firstPuttDistanceMeters: Math.min(60, Math.max(0, Math.round(Number(event.target.value)))) })} />
                    </div>
                    <div className="virtual-caddy-slider-row">
                      <button type="button" className="choice-chip" onClick={() => onPatch({ firstPuttDistanceMeters: Math.min(60, Math.max(0, firstPuttDistanceMeters - 5)) })}>-5m</button>
                      <button type="button" className="choice-chip" onClick={() => onPatch({ firstPuttDistanceMeters: Math.min(60, Math.max(0, firstPuttDistanceMeters - 1)) })}>-1m</button>
                      <button type="button" className="choice-chip" onClick={() => onPatch({ firstPuttDistanceMeters: Math.min(60, Math.max(0, firstPuttDistanceMeters + 1)) })}>+1m</button>
                      <button type="button" className="choice-chip" onClick={() => onPatch({ firstPuttDistanceMeters: Math.min(60, Math.max(0, firstPuttDistanceMeters + 5)) })}>+5m</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="prototype-block virtual-caddy-inline-result">
            <div className="virtual-caddy-inline-result-header">
              <span className="quick-select-label">{isPutting ? 'Putts' : isChipping ? 'Chip result' : outcomeMode === 'fairway' ? 'Fairway result' : 'Green result'}</span>
              <div className="virtual-caddy-inline-result-actions">
                {isPutting ? (
                  <button type="button" className="setup-toggle virtual-caddy-result-toggle" onClick={() => onPatch({ showPuttingDetails: !state.showPuttingDetails })} aria-expanded={state.showPuttingDetails}>
                    {state.showPuttingDetails ? 'Hide detail' : 'Add detail'}
                  </button>
                ) : canOverrideOutcomeMode ? (
                  <button type="button" className="setup-toggle virtual-caddy-result-toggle" onClick={onToggleOutcomeMode}>
                    {outcomeMode === 'fairway' ? 'Switch to green' : 'Switch to fairway'}
                  </button>
                ) : null}
                <button type="button" className={state.showPenaltyPicker || state.penaltyStrokes > 0 ? 'setup-toggle virtual-caddy-result-toggle active' : 'setup-toggle virtual-caddy-result-toggle'} onClick={() => onSetPenaltyStrokes(state.showPenaltyPicker || state.penaltyStrokes > 0 ? 0 : state.penaltyStrokes || 1)} aria-expanded={state.showPenaltyPicker || state.penaltyStrokes > 0}>
                  Add penalty
                </button>
                {!isPutting && outcomeMode === 'gir' ? (
                  <button type="button" className={state.outcomeSelection === 'girHoled' ? 'setup-toggle virtual-caddy-result-toggle active' : 'setup-toggle virtual-caddy-result-toggle'} onClick={() => onSetOutcomeSelection('girHoled')}>
                    Holed
                  </button>
                ) : null}
              </div>
            </div>
            {isPutting ? (
              <div className="quick-select-row" role="group" aria-label="Virtual caddy putts selection">
                {PUTT_COUNT_OPTIONS.map((value) => (
                  <button key={value} type="button" className={state.puttCount === value ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPuttCount(value)}>
                    {value}
                  </button>
                ))}
                <button key="putt-plus" type="button" className={typeof state.puttCount === 'number' && state.puttCount >= 4 ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPuttCount(state.puttCount == null ? 4 : Math.max(4, state.puttCount + 1))} aria-expanded={typeof state.puttCount === 'number' && state.puttCount >= 4} aria-label="Add more than 3 putts">
                  +
                </button>
                {typeof state.puttCount === 'number' && state.puttCount >= 4 ? (
                  <button type="button" className="counter-inline-value" onClick={() => onSetPuttCount(Math.max(4, state.puttCount - 1))} aria-label="Decrease custom putts value">
                    {state.puttCount}
                  </button>
                ) : null}
              </div>
            ) : useCompassResultLayout ? (
              <div className={`virtual-caddy-result-menu ${outcomeMode === 'fairway' ? 'fairway-menu' : 'gir-menu'}`} role="group" aria-label="Virtual caddy result selection">
                {outcomeOptions.filter((option) => option.key !== 'girHoled').map((option) => (
                  <button key={option.key} type="button" className={state.outcomeSelection === option.key ? `directional-btn ${getOutcomePositionClass(option.key as PlannerShot['outcomeSelection'] & string)} active` : `directional-btn ${getOutcomePositionClass(option.key as PlannerShot['outcomeSelection'] & string)}`} onClick={() => onSetOutcomeSelection(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="quick-select-row virtual-caddy-result-grid">
                {outcomeOptions.filter((option) => option.key !== 'girHoled').map((option) => (
                  <button key={option.key} type="button" className={state.outcomeSelection === option.key ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetOutcomeSelection(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <div className="virtual-caddy-result-actions">
              {state.showPenaltyPicker || state.penaltyStrokes > 0 ? (
                <div className="quick-select-row" role="group" aria-label="Virtual caddy penalty selection">
                  {PENALTY_STROKE_OPTIONS.map((value) => (
                    <button key={value} type="button" className={state.penaltyStrokes === value ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPenaltyStrokes(value)}>
                      {value === 0 ? 'None' : `+${value}`}
                    </button>
                  ))}
                  <button key="penalty-plus" type="button" className={state.penaltyStrokes >= 3 ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPenaltyStrokes(Math.max(3, state.penaltyStrokes + 1))} aria-expanded={state.penaltyStrokes >= 3} aria-label="Add more than 2 penalty strokes">
                    +
                  </button>
                  {state.penaltyStrokes >= 3 ? (
                    <button type="button" className="counter-inline-value" onClick={() => onSetPenaltyStrokes(state.penaltyStrokes <= 3 ? Math.max(0, state.penaltyStrokes - 1) : state.penaltyStrokes - 1)} aria-label="Decrease custom penalty strokes">
                      +{state.penaltyStrokes}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {isPutting && state.showPuttingDetails ? (
            <div className="prototype-block">
              <span className="quick-select-label">Detailed stats</span>
              <div className="stat-list">
                {PUTTING_DETAIL_OPTIONS.map((stat) => (
                  <div key={stat.key} className="counter-tile">
                    <div className="counter-tile-header">
                      <span>{stat.label}</span>
                      <div className="counter-value-grid" role="group" aria-label={`${stat.label} value`}>
                        <button type="button" className={getPuttDetailValue(stat.key) === 0 ? 'counter-value-btn counter-reset-btn active' : 'counter-value-btn counter-reset-btn'} onClick={() => onSetPuttDetail(stat.key, 0)}>
                          0
                        </button>
                        {[1, 2, 3].map((value) => (
                          <button key={value} type="button" className={getPuttDetailValue(stat.key) === value ? 'counter-value-btn active' : 'counter-value-btn'} onClick={() => onSetPuttDetail(stat.key, value)}>
                            {value}
                          </button>
                        ))}
                        <button type="button" className={getPuttDetailValue(stat.key) >= 4 ? 'counter-value-btn active' : 'counter-value-btn'} onClick={() => onSetPuttDetail(stat.key, getPuttDetailValue(stat.key) >= 4 ? getPuttDetailValue(stat.key) + 1 : 4)} aria-expanded={getPuttDetailValue(stat.key) >= 4} aria-label={`Enter a custom value for ${stat.label}`}>
                          +
                        </button>
                        {getPuttDetailValue(stat.key) >= 4 ? (
                          <button type="button" className="counter-inline-value" onClick={() => onSetPuttDetail(stat.key, Math.max(4, getPuttDetailValue(stat.key) - 1))} aria-label={`Decrease custom value for ${stat.label}`}>
                            {Math.max(4, getPuttDetailValue(stat.key))}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="virtual-caddy-card-footer">
        {onBack ? <button type="button" className="setup-toggle" onClick={onBack}>Back</button> : null}
        <button type="button" className="save-btn virtual-caddy-save-btn" disabled={!canSaveShot || isSavingShot} onClick={onSave}>
          {isSavingShot ? 'Saving...' : 'Save result'}
        </button>
      </div>
    </div>
  );
}
