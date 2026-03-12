import { STAT_SECTIONS } from '../../lib/constants';

type TotalsPageProps = {
  activeRoundName?: string;
  activeRoundHandicap?: number;
  totals: Record<string, number>;
};

export function TotalsPage({ activeRoundName, activeRoundHandicap = 0, totals }: TotalsPageProps) {
  return (
    <section className="card" aria-label="round totals">
      <h2>Round totals: {activeRoundName || '...'}</h2>
      <p className="hint">
        Score {totals.score} | Par {totals.par} | Stableford {totals.stableford} | Handicap {activeRoundHandicap}
      </p>
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
