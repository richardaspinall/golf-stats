import { STAT_SECTIONS } from '../../lib/constants';

type TotalsPageProps = {
  activeRoundName?: string;
  activeRoundHandicap?: number;
  totals: Record<string, number>;
  completedHolesPar: number;
  completedHolesCount: number;
};

export function TotalsPage({ activeRoundName, activeRoundHandicap = 0, totals, completedHolesPar, completedHolesCount }: TotalsPageProps) {
  const roundPar = totals.par || 0;
  const differential = totals.score - completedHolesPar;
  const differentialLabel = differential === 0 ? 'E' : differential > 0 ? `+${differential}` : String(differential);

  return (
    <section className="card" aria-label="round totals">
      <h2>Round totals: {activeRoundName || '...'}</h2>
      <p className="hint">
        Score {totals.score} | Stableford {totals.stableford} | Handicap {activeRoundHandicap} | Through {completedHolesCount} hole{completedHolesCount === 1 ? '' : 's'}
      </p>
      <div className="totals-summary-grid">
        <div className="totals-summary-card">
          <span className="totals-summary-label">Score</span>
          <strong>{totals.score}</strong>
        </div>
        <div className="totals-summary-card">
          <span className="totals-summary-label">Round par</span>
          <strong>{roundPar}</strong>
        </div>
        <div className="totals-summary-card">
          <span className="totals-summary-label">Differential</span>
          <strong>{differentialLabel}</strong>
        </div>
      </div>
      <div className="stat-section-list">
        {STAT_SECTIONS.map((section) => (
          <div key={section.title} className="stat-section">
            <h3 className="section-title">{section.title}</h3>
            <div className="total-list">
              {section.options.map((stat) => (
                <div key={stat.key} className="total-row">
                  <span>{stat.label}</span>
                  <strong>{totals[stat.key]}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
