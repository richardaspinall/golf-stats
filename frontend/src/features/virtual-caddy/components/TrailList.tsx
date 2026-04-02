import type { PlannerShot } from '../types';

type TrailListProps = {
  trail: PlannerShot[];
  getTrailRecordedDistanceMeters: (shot: PlannerShot, index: number) => number;
  getTrailSummary: (shot: PlannerShot) => string;
  onStartEdit: (index: number) => void;
};

export function TrailList({ trail, getTrailRecordedDistanceMeters, getTrailSummary, onStartEdit }: TrailListProps) {
  if (trail.length === 0) {
    return null;
  }

  return (
    <div className="virtual-caddy-trail">
      {[...trail].reverse().map((shot) => {
        const index = trail.findIndex((entry) => entry.id === shot.id);
        return (
          <div key={shot.id} className="prototype-block virtual-caddy-trail-card">
            <div className="virtual-caddy-trail-header">
              <div className="virtual-caddy-trail-title">
                <span className="virtual-caddy-trail-number">{index + 1}</span>
                <span className="quick-select-label">{shot.label}</span>
                <strong className="virtual-caddy-trail-club">
                  {shot.club} · {getTrailRecordedDistanceMeters(shot, index)}m
                </strong>
              </div>
              <button type="button" className="setup-toggle" onClick={() => onStartEdit(index)}>
                Edit
              </button>
            </div>
            <p className="virtual-caddy-trail-summary">{getTrailSummary(shot)}</p>
          </div>
        );
      })}
    </div>
  );
}
