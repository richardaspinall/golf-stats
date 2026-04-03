import type { ChangeEvent, ReactNode } from 'react';

import { SavePill } from '../../../components/SavePill';
import { HOLE_PREP_LIMITS } from '../../../lib/holePrep';
import type { HolePrepPlan } from '../../../types';

type PrepStepProps = {
  prepPlan: HolePrepPlan;
  isLocked: boolean;
  saveState: string;
  isDirty: boolean;
  headerActions?: ReactNode;
  onPatch: (patch: Partial<HolePrepPlan>) => void;
  onSave: () => void;
};

type PrepFieldProps = {
  label: string;
  value: string;
  maxLength: number;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
};

function PrepField({ label, value, maxLength, disabled, placeholder, onChange, multiline = false }: PrepFieldProps) {
  const commonProps = {
    value,
    disabled,
    maxLength,
    placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  };

  return (
    <label className="virtual-caddy-prep-field">
      <div className="virtual-caddy-prep-field-header">
        <span>{label}</span>
        <small>{`${value.length}/${maxLength}`}</small>
      </div>
      {multiline ? (
        <textarea {...commonProps} rows={3} />
      ) : (
        <input {...commonProps} type="text" />
      )}
    </label>
  );
}

export function PrepStep({ prepPlan, isLocked, saveState, isDirty, headerActions, onPatch, onSave }: PrepStepProps) {
  return (
    <div className="virtual-caddy-step">
      <div className="virtual-caddy-step-header">
        <div className="virtual-caddy-step-title">
          <div>
            <h5>Prep</h5>
            <p>{isLocked ? 'Prep is locked after play starts on this hole.' : 'Save the plan you want to see before playing this hole.'}</p>
          </div>
        </div>
        <div className="virtual-caddy-step-header-actions">{headerActions}</div>
      </div>
      <div className="prototype-block virtual-caddy-prep-block">
        <div className="virtual-caddy-prep-intro">
          <strong>Hole plan</strong>
          <span>Keep it concise. This stays informational and shows on the overview before the hole starts.</span>
        </div>
        <div className="virtual-caddy-prep-grid">
          <PrepField
            label="Strategy"
            value={prepPlan.strategy}
            maxLength={HOLE_PREP_LIMITS.strategy}
            disabled={isLocked}
            placeholder="How you want to play the hole"
            multiline
            onChange={(value) => onPatch({ strategy: value })}
          />
          <PrepField
            label="Danger"
            value={prepPlan.danger}
            maxLength={HOLE_PREP_LIMITS.danger}
            disabled={isLocked}
            placeholder="Main trouble to avoid"
            multiline
            onChange={(value) => onPatch({ danger: value })}
          />
          <PrepField
            label="Aim"
            value={prepPlan.aim}
            maxLength={HOLE_PREP_LIMITS.aim}
            disabled={isLocked}
            placeholder="Aim point or preferred miss"
            multiline
            onChange={(value) => onPatch({ aim: value })}
          />
          <PrepField
            label="Planned tee club"
            value={prepPlan.plannedTeeClub}
            maxLength={HOLE_PREP_LIMITS.plannedTeeClub}
            disabled={isLocked}
            placeholder="Driver, 3 wood, 5i..."
            onChange={(value) => onPatch({ plannedTeeClub: value })}
          />
          <PrepField
            label="Planned layup club"
            value={prepPlan.plannedLayupClub}
            maxLength={HOLE_PREP_LIMITS.plannedLayupClub}
            disabled={isLocked}
            placeholder="Optional layup club"
            onChange={(value) => onPatch({ plannedLayupClub: value })}
          />
          <PrepField
            label="Commitment cue"
            value={prepPlan.commitmentCue}
            maxLength={HOLE_PREP_LIMITS.commitmentCue}
            disabled={isLocked}
            placeholder="Single cue for commitment"
            onChange={(value) => onPatch({ commitmentCue: value })}
          />
        </div>
      </div>
      <div className="virtual-caddy-card-footer">
        <SavePill state={saveState} />
        {!isLocked ? (
          <button type="button" className="save-btn virtual-caddy-save-btn" onClick={onSave} disabled={!isDirty || saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving...' : 'Save prep'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
