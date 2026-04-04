import type { ReactNode } from 'react';

import { FAIRWAY_SECTION, GIR_EXTRA_OPTIONS, GIR_SECTION } from '../../../lib/constants';

const FAIRWAY_OPTION_ORDER = ['fairwayHit', 'fairwayLeft', 'fairwayRight', 'fairwayLong', 'fairwayShort'];
const GIR_OPTION_ORDER = ['girHit', 'girLeft', 'girRight', 'girLong', 'girShort', 'girNoChance'];

type QuickTotalsStepProps = {
  totalScore: number;
  scorePresetValues: number[];
  fairwaySelection: string | null;
  girSelection: string | null;
  putts: number;
  penalties: number;
  isSaving: boolean;
  saveLabel?: string;
  secondaryActionLabel?: string;
  headerActions?: ReactNode;
  onSetTotalScore: (value: number) => void;
  getScorePresetLabel: (value: number) => string;
  onSetFairwaySelection: (value: string | null) => void;
  onSetGirSelection: (value: string | null) => void;
  onSetPutts: (value: number) => void;
  onSetPenalties: (value: number) => void;
  onSave: () => void;
  onSecondaryAction?: () => void;
};

const PUTT_OPTIONS = [0, 1, 2, 3] as const;
const PENALTY_OPTIONS = [0, 1, 2] as const;

export function QuickTotalsStep({
  totalScore,
  scorePresetValues,
  fairwaySelection,
  girSelection,
  putts,
  penalties,
  isSaving,
  saveLabel,
  secondaryActionLabel,
  headerActions,
  onSetTotalScore,
  getScorePresetLabel,
  onSetFairwaySelection,
  onSetGirSelection,
  onSetPutts,
  onSetPenalties,
  onSave,
  onSecondaryAction,
}: QuickTotalsStepProps) {
  const fairwayOptions = [...FAIRWAY_SECTION.options].sort((a, b) => FAIRWAY_OPTION_ORDER.indexOf(a.key) - FAIRWAY_OPTION_ORDER.indexOf(b.key));
  const girOptions = [...GIR_SECTION.options, ...GIR_EXTRA_OPTIONS].sort((a, b) => GIR_OPTION_ORDER.indexOf(a.key) - GIR_OPTION_ORDER.indexOf(b.key));

  return (
    <div className="virtual-caddy-step">
      <div className="virtual-caddy-step-header">
        <div className="virtual-caddy-step-title">
          <div>
            <h5>Quick</h5>
            <p>Skip shot-by-shot tracking and save a simple hole summary.</p>
          </div>
        </div>
        <div className="virtual-caddy-step-header-actions">{headerActions}</div>
      </div>
      <div className="prototype-block virtual-caddy-quick-totals">
        <div className="quick-select-group">
          <span className="quick-select-label">Total score</span>
          <div className="stat-row virtual-caddy-quick-totals-score-row">
            <span className="virtual-caddy-quick-totals-score-spacer" />
            <div className="stat-actions">
              <button type="button" aria-label="Decrease quick totals score" onClick={() => onSetTotalScore(totalScore - 1)}>
                -
              </button>
              <strong>{totalScore}</strong>
              <button type="button" aria-label="Increase quick totals score" onClick={() => onSetTotalScore(totalScore + 1)}>
                +
              </button>
            </div>
          </div>
          <div className="score-preset-grid" role="group" aria-label="Quick score presets">
            {scorePresetValues.map((value) => (
              <button
                key={value}
                type="button"
                className={totalScore === value ? 'score-preset active' : 'score-preset'}
                onClick={() => onSetTotalScore(value)}
              >
                <strong>{value}</strong>
                <span>{getScorePresetLabel(value)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="quick-select-group">
          <span className="quick-select-label">Fairway</span>
          <div className="quick-select-row" role="group" aria-label="Quick fairway selection">
            {fairwayOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={fairwaySelection === option.key ? 'choice-chip active' : 'choice-chip'}
                onClick={() => onSetFairwaySelection(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="quick-select-group">
          <span className="quick-select-label">GIR</span>
          <div className="quick-select-row" role="group" aria-label="Quick GIR selection">
            {girOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={girSelection === option.key ? 'choice-chip active' : 'choice-chip'}
                onClick={() => onSetGirSelection(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="quick-select-group">
          <span className="quick-select-label">Putts</span>
          <div className="quick-select-row" role="group" aria-label="Quick putts selection">
            {PUTT_OPTIONS.map((value) => (
              <button key={value} type="button" className={putts === value ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPutts(value)}>
                {value}
              </button>
            ))}
            <button
              type="button"
              className={putts >= 4 ? 'choice-chip active' : 'choice-chip'}
              onClick={() => onSetPutts(putts >= 4 ? putts + 1 : 4)}
              aria-expanded={putts >= 4}
              aria-label="Add more than 3 putts"
            >
              +
            </button>
            {putts >= 4 ? (
              <button type="button" className="counter-inline-value" onClick={() => onSetPutts(Math.max(4, putts - 1))} aria-label="Decrease custom quick totals putts value">
                {putts}
              </button>
            ) : null}
          </div>
        </div>
        <div className="quick-select-group">
          <span className="quick-select-label">Penalties</span>
          <div className="quick-select-row" role="group" aria-label="Quick penalties selection">
            {PENALTY_OPTIONS.map((value) => (
              <button key={value} type="button" className={penalties === value ? 'choice-chip active' : 'choice-chip'} onClick={() => onSetPenalties(value)}>
                {value}
              </button>
            ))}
            <button
              type="button"
              className={penalties >= 3 ? 'choice-chip active' : 'choice-chip'}
              onClick={() => onSetPenalties(penalties >= 3 ? penalties + 1 : 3)}
              aria-expanded={penalties >= 3}
              aria-label="Add more than 2 penalties"
            >
              +
            </button>
            {penalties >= 3 ? (
              <button type="button" className="counter-inline-value" onClick={() => onSetPenalties(Math.max(3, penalties - 1))} aria-label="Decrease custom quick totals penalties value">
                {penalties}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="virtual-caddy-card-footer">
        {onSecondaryAction ? (
          <button type="button" className="setup-toggle" onClick={onSecondaryAction}>
            {secondaryActionLabel ?? 'Back'}
          </button>
        ) : null}
        <button type="button" className="save-btn virtual-caddy-save-btn" disabled={isSaving} onClick={onSave}>
          {isSaving ? 'Saving...' : saveLabel ?? 'Save and next'}
        </button>
      </div>
    </div>
  );
}
