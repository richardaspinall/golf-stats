import type { ReactNode } from 'react';

import { hasHolePrepPlanContent } from '../../../lib/holePrep';
import type { HolePrepPlan } from '../../../types';

type OverviewStepProps = {
  isFirstShot: boolean;
  shotNumber: number;
  overviewTitle: string;
  overviewDistanceSummary: string | null;
  editingIndex: number | null;
  hole: number;
  displayHoleIndex: number | null;
  displayHolePar: number | null;
  defaultDistanceMeters: number | null;
  distanceToHoleMeters: number;
  prepPlan: HolePrepPlan;
  headerActions?: ReactNode;
  onCancelEdit: () => void;
  onNext: () => void;
};

export function OverviewStep({
  isFirstShot,
  shotNumber,
  overviewTitle,
  overviewDistanceSummary,
  editingIndex,
  hole,
  displayHoleIndex,
  displayHolePar,
  defaultDistanceMeters,
  distanceToHoleMeters,
  prepPlan,
  headerActions,
  onCancelEdit,
  onNext,
}: OverviewStepProps) {
  const hasPrepPlan = hasHolePrepPlanContent(prepPlan);

  return (
    <div className="virtual-caddy-step">
      <div className="virtual-caddy-step-header">
        <div className="virtual-caddy-step-title">
          {!isFirstShot ? <span className="virtual-caddy-step-number">{shotNumber}</span> : null}
          <div>
            <h5>{overviewTitle}</h5>
            {!isFirstShot && overviewDistanceSummary ? <p>{overviewDistanceSummary}</p> : null}
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
      <div className="prototype-block virtual-caddy-distance-block">
        <div className={isFirstShot ? 'virtual-caddy-overview-card virtual-caddy-overview-card-hole' : 'virtual-caddy-overview-card'}>
          {isFirstShot ? (
            <>
              <div className="virtual-caddy-overview-detail virtual-caddy-overview-detail-primary">
                <span>Hole</span>
                <strong>{hole}</strong>
              </div>
              <div className="virtual-caddy-overview-row">
                {displayHoleIndex != null ? (
                  <div className="virtual-caddy-overview-detail">
                    <span>Index</span>
                    <strong>{displayHoleIndex}</strong>
                  </div>
                ) : null}
                {displayHolePar != null ? (
                  <div className="virtual-caddy-overview-detail">
                    <span>Par</span>
                    <strong>{displayHolePar}</strong>
                  </div>
                ) : null}
                {defaultDistanceMeters != null ? (
                  <div className="virtual-caddy-overview-detail">
                    <span>Length</span>
                    <strong>{defaultDistanceMeters}m</strong>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="virtual-caddy-overview-hero">
                <span className="virtual-caddy-overview-kicker">Distance left</span>
                <strong>{`${distanceToHoleMeters}m`}</strong>
              </div>
              <div className="virtual-caddy-overview-details">
                {displayHoleIndex != null ? (
                  <div className="virtual-caddy-overview-detail">
                    <span>Index</span>
                    <strong>{displayHoleIndex}</strong>
                  </div>
                ) : null}
                {displayHolePar != null ? (
                  <div className="virtual-caddy-overview-detail">
                    <span>Par</span>
                    <strong>{displayHolePar}</strong>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
      {isFirstShot && hasPrepPlan ? (
        <div className="prototype-block virtual-caddy-prep-summary-block">
          <div className="virtual-caddy-overview-card">
            <div className="virtual-caddy-overview-hero">
              <span className="virtual-caddy-overview-kicker">Hole plan</span>
            </div>
            <div className="virtual-caddy-prep-summary">
              <p>
                <strong>Strategy:</strong> {prepPlan.strategy}
              </p>
              {prepPlan.danger ? (
                <p>
                  <strong>Danger:</strong> {prepPlan.danger}
                </p>
              ) : null}
              {prepPlan.aim ? (
                <p>
                  <strong>Aim:</strong> {prepPlan.aim}
                </p>
              ) : null}
              {prepPlan.plannedTeeClub ? (
                <p>
                  <strong>Tee club:</strong> {prepPlan.plannedTeeClub}
                </p>
              ) : null}
              {prepPlan.plannedLayupClub ? (
                <p>
                  <strong>Layup club:</strong> {prepPlan.plannedLayupClub}
                </p>
              ) : null}
              {prepPlan.commitmentCue ? (
                <p>
                  <strong>Commitment cue:</strong> {prepPlan.commitmentCue}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="virtual-caddy-card-footer">
        <button type="button" className="save-btn virtual-caddy-save-btn" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
