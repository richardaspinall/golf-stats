import type { RoundListItem, RoundSummaryData } from '../../types';

type RoundsPageProps = {
  selectedRoundId: string;
  switchRound: (roundId: string) => void;
  isSwitchingRound: boolean;
  rounds: RoundListItem[];
  deleteRound: () => void;
  roundSummariesError: string;
  roundSummaries: Record<string, RoundSummaryData>;
  roundSummariesState: string;
};

export function RoundsPage({
  selectedRoundId,
  switchRound,
  isSwitchingRound,
  rounds,
  deleteRound,
  roundSummariesError,
  roundSummaries,
  roundSummariesState,
}: RoundsPageProps) {
  return (
    <section className="card" aria-label="rounds overview">
      <h2>Rounds</h2>
      <div className="rounds-controls">
        <label className="rounds-field">
          <span>Active round</span>
          <select
            className="round-select"
            value={selectedRoundId}
            onChange={(event) => switchRound(event.target.value)}
            disabled={isSwitchingRound || rounds.length === 0}
          >
            {rounds.length === 0 ? (
              <option value="">No rounds yet</option>
            ) : (
              rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))
            )}
          </select>
        </label>
        <button className="reset-btn" onClick={deleteRound} disabled={!selectedRoundId || isSwitchingRound}>
          Delete round
        </button>
      </div>
      {roundSummariesError ? <p className="hint">{roundSummariesError}</p> : null}
      <div className="rounds-summary-table">
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Total score</th>
              <th>Up & down</th>
              <th>OOP total</th>
              <th>Fairway hit</th>
              <th>GIR hit</th>
              <th>Over 3 score</th>
            </tr>
          </thead>
          <tbody>
            {rounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="rounds-empty">
                  No rounds yet.
                </td>
              </tr>
            ) : (
              rounds.map((round) => {
                const summary = roundSummaries[round.id];
                const totals = summary?.totals;
                const isLoadingSummary = !summary && roundSummariesState === 'loading';
                const fallback = isLoadingSummary ? '...' : '—';

                return (
                  <tr key={round.id} className={round.id === selectedRoundId ? 'active' : ''}>
                    <td data-label="Round">{round.name}</td>
                    <td data-label="Total score" className="numeric">
                      {totals ? totals.score : fallback}
                    </td>
                    <td data-label="Up & down" className="numeric">
                      {totals ? totals.upAndDown || 0 : fallback}
                    </td>
                    <td data-label="OOP total" className="numeric">
                      {totals ? (totals.oopLook || 0) + (totals.oopNoLook || 0) : fallback}
                    </td>
                    <td data-label="Fairway hit" className="numeric">
                      {totals ? totals.fairwayHit : fallback}
                    </td>
                    <td data-label="GIR hit" className="numeric">
                      {totals ? totals.girHit : fallback}
                    </td>
                    <td data-label="Over 3 score" className="numeric">
                      {totals ? totals.inside100Over3 : fallback}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
