type CompletionCardProps = {
  isHoleInOneFinish: boolean;
  showHoledCelebration: boolean;
  completionTitle: string;
  completionDetail: string | null;
  par: number | null;
  score: number;
  putts: number;
  tone: string;
  awaitingHoleAdvance: boolean;
  onNext: () => void;
};

export function CompletionCard({
  isHoleInOneFinish,
  showHoledCelebration,
  completionTitle,
  completionDetail,
  par,
  score,
  putts,
  tone,
  awaitingHoleAdvance,
  onNext,
}: CompletionCardProps) {
  const className = isHoleInOneFinish
    ? 'prototype-block virtual-caddy-complete virtual-caddy-complete-hole-in-one'
    : showHoledCelebration
      ? 'prototype-block virtual-caddy-complete virtual-caddy-complete-celebration'
      : 'prototype-block virtual-caddy-complete';

  return (
    <div className={className}>
      {showHoledCelebration ? (
        <div className="virtual-caddy-complete-burst" aria-hidden="true">
          <span className="virtual-caddy-complete-orbit virtual-caddy-complete-orbit-one" />
          <span className="virtual-caddy-complete-orbit virtual-caddy-complete-orbit-two" />
          <span className="virtual-caddy-complete-glow virtual-caddy-complete-glow-one" />
          <span className="virtual-caddy-complete-glow virtual-caddy-complete-glow-two" />
          <span className="virtual-caddy-complete-star virtual-caddy-complete-star-one" />
          <span className="virtual-caddy-complete-star virtual-caddy-complete-star-two" />
          <span className="virtual-caddy-complete-star virtual-caddy-complete-star-three" />
        </div>
      ) : null}
      <div className="virtual-caddy-complete-header">
        <span className="quick-select-label">{completionTitle}</span>
        {completionDetail ? <p>{completionDetail}</p> : null}
      </div>
      <div className="virtual-caddy-complete-summary">
        <div className="virtual-caddy-complete-stat">
          <span>Par</span>
          <strong>{par ?? '-'}</strong>
        </div>
        <div className="virtual-caddy-complete-stat">
          <span>Score</span>
          <strong className={`virtual-caddy-score-mark virtual-caddy-score-mark-${tone}`}>{score}</strong>
        </div>
        <div className="virtual-caddy-complete-stat">
          <span>Putts</span>
          <strong>{putts}</strong>
        </div>
      </div>
      {awaitingHoleAdvance ? (
        <div className="virtual-caddy-card-footer">
          <button type="button" className="save-btn virtual-caddy-save-btn" onClick={onNext}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
