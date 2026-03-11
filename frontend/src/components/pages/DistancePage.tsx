import type { CarryByClub, ClubAverage } from '../../types';

type ClubActualEntry = {
  id: number;
  club: string;
  actualMeters: number;
};

type DistancePageProps = {
  state: {
    distanceMode: string;
    isLoadingClubActualEntries: boolean;
    clubActualEntriesError: string;
    clubActualEntries: ClubActualEntry[];
    isLoadingClubAverages: boolean;
    clubAveragesError: string;
    clubAverages: ClubAverage[];
    clubCarryByClub: CarryByClub;
    clubCarrySaveState: string;
  };
  actions: {
    setDistanceMode: (value: string) => void;
    setClubActualEntriesDirty: (value: boolean) => void;
    deleteClubActualEntry: (entryId: number) => void;
    setCarryForClub: (club: string, value: string) => void;
    saveClubCarry: () => void;
  };
};

export function DistancePage({ state, actions }: DistancePageProps) {
  const {
    distanceMode,
    isLoadingClubActualEntries,
    clubActualEntriesError,
    clubActualEntries,
    isLoadingClubAverages,
    clubAveragesError,
    clubAverages,
    clubCarryByClub,
    clubCarrySaveState,
  } = state;
  const { setDistanceMode, setClubActualEntriesDirty, deleteClubActualEntry, setCarryForClub, saveClubCarry } = actions;
  return (
    <section className="card" aria-label="distance setup prototype">
      <div className="card-header">
        <h2>Distances</h2>
      </div>
      <p className="hint">Use this tab to capture distance, setup choices, and swing clock feel.</p>
      {distanceMode === 'setup' ? (
        <div className="distance-log">
          <div className="distance-log-header">
            <h3>Saved distances</h3>
            <button type="button" onClick={() => setClubActualEntriesDirty(true)} disabled={isLoadingClubActualEntries}>
              {isLoadingClubActualEntries ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {isLoadingClubActualEntries ? <p className="hint">Loading shot log...</p> : null}
          {!isLoadingClubActualEntries && clubActualEntriesError ? <p className="hint">{clubActualEntriesError}</p> : null}
          {!isLoadingClubActualEntries && !clubActualEntriesError ? (
            clubActualEntries.length > 0 ? (
              <div className="distance-log-list">
                {clubActualEntries.map((entry) => (
                  <div key={entry.id} className="distance-log-row">
                    <div className="distance-log-meta">
                      <strong>{entry.club}</strong>
                      <span>{entry.actualMeters}m</span>
                    </div>
                    <button type="button" className="reset-btn" onClick={() => deleteClubActualEntry(entry.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">No saved distances yet.</p>
            )
          ) : null}
        </div>
      ) : null}

      <div className="distance-averages">
        <h3>Club distance averages</h3>
        <p className="hint">Averages are based on your independent shot log and are not deleted with rounds.</p>
        {isLoadingClubAverages ? <p className="hint">Loading averages...</p> : null}
        {!isLoadingClubAverages && clubAveragesError ? <p className="hint">{clubAveragesError}</p> : null}
        {!isLoadingClubAverages && !clubAveragesError ? (
          clubAverages.length > 0 ? (
            <div className="distance-table">
              <table className="wedge-matrix-table">
                <thead>
                  <tr>
                    <th>Club</th>
                    <th>Carry</th>
                    <th>Total (X shots)</th>
                  </tr>
                </thead>
                <tbody>
                  {clubAverages.map((entry) => {
                    const carryValue = clubCarryByClub[entry.club];
                    const totalLabel = entry.avgMeters !== null ? `${entry.avgMeters}m (${entry.shots} shots)` : 'No data yet';
                    return (
                      <tr key={entry.club}>
                        <td className="wedge-label">{entry.club}</td>
                        <td>
                          {distanceMode === 'setup' ? (
                            <label className="carry-field">
                              Carry
                              <input
                                type="number"
                                min={0}
                                max={400}
                                step={1}
                                value={carryValue ?? ''}
                                onChange={(event) => setCarryForClub(entry.club, event.target.value)}
                                placeholder="m"
                              />
                            </label>
                          ) : (
                            <span>{carryValue != null ? `${carryValue}m` : '—'}</span>
                          )}
                        </td>
                        <td>{totalLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="hint">No saved shot-note data found yet.</p>
          )
        ) : null}
        {distanceMode === 'setup' ? (
          <>
            <p className="hint">Carry save: {clubCarrySaveState}</p>
            <div className="manual-save-row">
              <button
                className="save-btn"
                onClick={saveClubCarry}
                disabled={clubCarrySaveState === 'saving' || clubCarrySaveState === 'loading'}
              >
                {clubCarrySaveState === 'saving' ? 'Saving...' : 'Save carry'}
              </button>
            </div>
          </>
        ) : null}
      </div>
      <div className="setup-footer">
        {distanceMode === 'setup' ? (
          <button type="button" className="setup-toggle" onClick={() => setDistanceMode('view')}>
            Close setup
          </button>
        ) : (
          <button type="button" className="setup-toggle" onClick={() => setDistanceMode('setup')}>
            Set up
          </button>
        )}
      </div>
    </section>
  );
}
