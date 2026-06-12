import { STAT_SECTIONS } from '../../lib/constants';
import { buildRoundExportCsv, buildRoundExportFilename, downloadRoundExportCsv } from '../../lib/roundExport';
import type { RoundSummaryTotals } from '../../types';

type TotalsPageProps = {
  activeRoundLabel?: string;
  activeRoundDate?: string;
  activeRoundHandicap?: number;
  activeCourseName?: string;
  totals: RoundSummaryTotals;
  completedHolesPar: number;
  completedHolesCount: number;
};

export function TotalsPage({
  activeRoundLabel,
  activeRoundDate,
  activeRoundHandicap = 0,
  activeCourseName,
  totals,
  completedHolesPar,
  completedHolesCount,
}: TotalsPageProps) {
  const roundPar = totals.par || 0;
  const differential = totals.score - completedHolesPar;
  const differentialLabel = differential === 0 ? 'E' : differential > 0 ? `+${differential}` : String(differential);
  const hasRoundToExport = Boolean(activeRoundDate || completedHolesCount > 0);

  const exportRound = () => {
    const csv = buildRoundExportCsv({
      roundDate: activeRoundDate,
      courseName: activeCourseName,
      handicap: activeRoundHandicap,
      totals,
      completedHolesPar,
      completedHolesCount,
    });
    const filename = buildRoundExportFilename(activeRoundDate);
    downloadRoundExportCsv(filename, csv);
  };

  return (
    <section className="card" aria-label="round totals">
      <div className="totals-header">
        <div>
          <h2>Round totals: {activeRoundLabel || '...'}</h2>
        </div>
        <button type="button" onClick={exportRound} disabled={!hasRoundToExport}>
          Export CSV
        </button>
      </div>
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
