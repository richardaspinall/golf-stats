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
  onCancelEdit,
  onNext,
}: OverviewStepProps) {
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
        {editingIndex != null ? (
          <button type="button" className="icon-close-btn" aria-label="Cancel edit" onClick={onCancelEdit}>
            ×
          </button>
        ) : null}
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
      <div className="virtual-caddy-card-footer">
        <button type="button" className="save-btn virtual-caddy-save-btn" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
