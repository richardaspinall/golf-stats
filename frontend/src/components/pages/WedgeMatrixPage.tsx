import { CLUB_OPTIONS, SWING_CLOCK_OPTIONS } from '../../lib/constants';
import type { WedgeMatrixRow } from '../../lib/wedgeMatrix';
import type { WedgeEntry, WedgeMatrix } from '../../types';

type WedgeEntriesByMatrix = Record<number, WedgeEntry[]>;

type WedgeMatrixPageProps = {
  state: {
    wedgeMatrixMode: string;
    isWedgeMatrixFormOpen: boolean;
    editingWedgeMatrixId: number | null;
    wedgeMatrixName: string;
    wedgeMatrixClubs: string[];
    wedgeMatrixSwingClocks: string[];
    wedgeMatrixEnabledColumns: boolean[];
    wedgeMatrixStanceWidth: string;
    wedgeMatrixGrip: string;
    wedgeMatrixBallPosition: string;
    wedgeMatrixNotes: string;
    isLoadingWedgeMatrices: boolean;
    wedgeMatricesError: string;
    wedgeMatrices: WedgeMatrix[];
    wedgeEntriesByMatrix: WedgeEntriesByMatrix;
    activeWedgeMatrixId: number | null;
    isWedgeFormOpen: boolean;
    wedgeClubSelection: string;
    wedgeSwingClock: string;
    wedgeDistanceUnit: string;
    wedgeDistancePaces: number;
    wedgeDistanceMeters: number;
    editingWedgeEntryId: number | null;
    recentEntriesMatrixId: number | null;
    wedgeEntryError: string;
    isLoadingWedgeEntries: boolean;
    wedgeEntriesError: string;
    wedgeEntrySaveState: string;
  };
  actions: {
    setWedgeMatrixMode: (value: string) => void;
    setIsWedgeMatrixFormOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    setWedgeMatricesError: (value: string) => void;
    saveWedgeMatrix: (event: React.FormEvent<HTMLFormElement>) => void;
    startWedgeMatrixEdit: (matrix: WedgeMatrix) => void;
    cancelWedgeMatrixEdit: () => void;
    setEditingWedgeMatrixId: (value: number | null) => void;
    setWedgeMatrixName: (value: string) => void;
    toggleWedgeMatrixClub: (club: string) => void;
    setWedgeMatrixSwingClockValue: (index: number, value: string) => void;
    setWedgeMatrixColumnEnabled: (index: number, enabled: boolean) => void;
    setWedgeMatrixStanceWidth: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixGrip: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixBallPosition: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixNotes: (value: string) => void;
    setActiveWedgeMatrixId: (value: number | null) => void;
    setIsWedgeFormOpen: (value: boolean) => void;
    setEditingWedgeEntryId: (value: number | null) => void;
    setRecentEntriesMatrixId: (value: number | null | ((prev: number | null) => number | null)) => void;
    setWedgeEntryError: (value: string) => void;
    deleteWedgeMatrix: (matrixId: number) => void;
    addWedgeEntry: (event: React.FormEvent<HTMLFormElement>) => void;
    toggleWedgeSelection: (club: string) => void;
    toggleWedgeSwingClock: (clock: string) => void;
    setWedgeDistanceUnit: (value: string) => void;
    setWedgeDistancePaces: (value: number) => void;
    setWedgeDistanceMeters: (value: number) => void;
    cancelWedgeEdit: () => void;
    startWedgeEdit: (entry: WedgeEntry) => void;
    deleteWedgeEntry: (entryId: number, matrixId: number) => void;
  };
  helpers: {
    buildWedgeMatrixRows: (entries: WedgeEntry[], clubs: string[], swingClocks: string[]) => WedgeMatrixRow[];
    sortClubsByDefaultOrder: (clubs: string[]) => string[];
    metersToPaces: (meters: number) => number;
    pacesToMeters: (paces: number) => number;
  };
};

type WedgeMatrixCreateFormProps = {
  saveWedgeMatrix: WedgeMatrixPageProps['actions']['saveWedgeMatrix'];
  editingWedgeMatrixId: WedgeMatrixPageProps['state']['editingWedgeMatrixId'];
  cancelWedgeMatrixEdit: WedgeMatrixPageProps['actions']['cancelWedgeMatrixEdit'];
  wedgeMatrixName: WedgeMatrixPageProps['state']['wedgeMatrixName'];
  setWedgeMatrixName: WedgeMatrixPageProps['actions']['setWedgeMatrixName'];
  wedgeMatrixClubs: WedgeMatrixPageProps['state']['wedgeMatrixClubs'];
  toggleWedgeMatrixClub: WedgeMatrixPageProps['actions']['toggleWedgeMatrixClub'];
  wedgeMatrixSwingClocks: WedgeMatrixPageProps['state']['wedgeMatrixSwingClocks'];
  wedgeMatrixEnabledColumns: WedgeMatrixPageProps['state']['wedgeMatrixEnabledColumns'];
  setWedgeMatrixSwingClockValue: WedgeMatrixPageProps['actions']['setWedgeMatrixSwingClockValue'];
  setWedgeMatrixColumnEnabled: WedgeMatrixPageProps['actions']['setWedgeMatrixColumnEnabled'];
  wedgeMatrixStanceWidth: WedgeMatrixPageProps['state']['wedgeMatrixStanceWidth'];
  setWedgeMatrixStanceWidth: WedgeMatrixPageProps['actions']['setWedgeMatrixStanceWidth'];
  wedgeMatrixGrip: WedgeMatrixPageProps['state']['wedgeMatrixGrip'];
  setWedgeMatrixGrip: WedgeMatrixPageProps['actions']['setWedgeMatrixGrip'];
  wedgeMatrixBallPosition: WedgeMatrixPageProps['state']['wedgeMatrixBallPosition'];
  setWedgeMatrixBallPosition: WedgeMatrixPageProps['actions']['setWedgeMatrixBallPosition'];
  wedgeMatrixNotes: WedgeMatrixPageProps['state']['wedgeMatrixNotes'];
  setWedgeMatrixNotes: WedgeMatrixPageProps['actions']['setWedgeMatrixNotes'];
};

type WedgeEntryFormProps = {
  addWedgeEntry: WedgeMatrixPageProps['actions']['addWedgeEntry'];
  matrixClubs: string[];
  matrixSwingClocks: string[];
  wedgeClubSelection: WedgeMatrixPageProps['state']['wedgeClubSelection'];
  toggleWedgeSelection: WedgeMatrixPageProps['actions']['toggleWedgeSelection'];
  wedgeSwingClock: WedgeMatrixPageProps['state']['wedgeSwingClock'];
  toggleWedgeSwingClock: WedgeMatrixPageProps['actions']['toggleWedgeSwingClock'];
  wedgeDistanceUnit: WedgeMatrixPageProps['state']['wedgeDistanceUnit'];
  setWedgeDistanceUnit: WedgeMatrixPageProps['actions']['setWedgeDistanceUnit'];
  wedgeDistancePaces: WedgeMatrixPageProps['state']['wedgeDistancePaces'];
  setWedgeDistancePaces: WedgeMatrixPageProps['actions']['setWedgeDistancePaces'];
  wedgeDistanceMeters: WedgeMatrixPageProps['state']['wedgeDistanceMeters'];
  setWedgeDistanceMeters: WedgeMatrixPageProps['actions']['setWedgeDistanceMeters'];
  metersToPaces: WedgeMatrixPageProps['helpers']['metersToPaces'];
  pacesToMeters: WedgeMatrixPageProps['helpers']['pacesToMeters'];
  editingWedgeEntryId: WedgeMatrixPageProps['state']['editingWedgeEntryId'];
  cancelWedgeEdit: WedgeMatrixPageProps['actions']['cancelWedgeEdit'];
  wedgeEntryError: WedgeMatrixPageProps['state']['wedgeEntryError'];
  setIsWedgeFormOpen: WedgeMatrixPageProps['actions']['setIsWedgeFormOpen'];
  setEditingWedgeEntryId: WedgeMatrixPageProps['actions']['setEditingWedgeEntryId'];
};

type WedgeMatrixCardProps = {
  matrix: WedgeMatrix;
  entries: WedgeEntry[];
  wedgeMatrixMode: WedgeMatrixPageProps['state']['wedgeMatrixMode'];
  activeWedgeMatrixId: WedgeMatrixPageProps['state']['activeWedgeMatrixId'];
  setActiveWedgeMatrixId: WedgeMatrixPageProps['actions']['setActiveWedgeMatrixId'];
  startWedgeMatrixEdit: WedgeMatrixPageProps['actions']['startWedgeMatrixEdit'];
  setIsWedgeFormOpen: WedgeMatrixPageProps['actions']['setIsWedgeFormOpen'];
  setEditingWedgeEntryId: WedgeMatrixPageProps['actions']['setEditingWedgeEntryId'];
  recentEntriesMatrixId: WedgeMatrixPageProps['state']['recentEntriesMatrixId'];
  setRecentEntriesMatrixId: WedgeMatrixPageProps['actions']['setRecentEntriesMatrixId'];
  setWedgeEntryError: WedgeMatrixPageProps['actions']['setWedgeEntryError'];
  deleteWedgeMatrix: WedgeMatrixPageProps['actions']['deleteWedgeMatrix'];
  isWedgeFormOpen: WedgeMatrixPageProps['state']['isWedgeFormOpen'];
  addWedgeEntry: WedgeMatrixPageProps['actions']['addWedgeEntry'];
  wedgeClubSelection: WedgeMatrixPageProps['state']['wedgeClubSelection'];
  toggleWedgeSelection: WedgeMatrixPageProps['actions']['toggleWedgeSelection'];
  wedgeSwingClock: WedgeMatrixPageProps['state']['wedgeSwingClock'];
  toggleWedgeSwingClock: WedgeMatrixPageProps['actions']['toggleWedgeSwingClock'];
  wedgeDistanceUnit: WedgeMatrixPageProps['state']['wedgeDistanceUnit'];
  setWedgeDistanceUnit: WedgeMatrixPageProps['actions']['setWedgeDistanceUnit'];
  wedgeDistancePaces: WedgeMatrixPageProps['state']['wedgeDistancePaces'];
  setWedgeDistancePaces: WedgeMatrixPageProps['actions']['setWedgeDistancePaces'];
  wedgeDistanceMeters: WedgeMatrixPageProps['state']['wedgeDistanceMeters'];
  setWedgeDistanceMeters: WedgeMatrixPageProps['actions']['setWedgeDistanceMeters'];
  metersToPaces: WedgeMatrixPageProps['helpers']['metersToPaces'];
  pacesToMeters: WedgeMatrixPageProps['helpers']['pacesToMeters'];
  editingWedgeEntryId: WedgeMatrixPageProps['state']['editingWedgeEntryId'];
  cancelWedgeEdit: WedgeMatrixPageProps['actions']['cancelWedgeEdit'];
  wedgeEntryError: WedgeMatrixPageProps['state']['wedgeEntryError'];
  isLoadingWedgeEntries: WedgeMatrixPageProps['state']['isLoadingWedgeEntries'];
  wedgeEntriesError: WedgeMatrixPageProps['state']['wedgeEntriesError'];
  wedgeEntrySaveState: WedgeMatrixPageProps['state']['wedgeEntrySaveState'];
  startWedgeEdit: WedgeMatrixPageProps['actions']['startWedgeEdit'];
  deleteWedgeEntry: WedgeMatrixPageProps['actions']['deleteWedgeEntry'];
  buildWedgeMatrixRows: WedgeMatrixPageProps['helpers']['buildWedgeMatrixRows'];
  sortClubsByDefaultOrder: WedgeMatrixPageProps['helpers']['sortClubsByDefaultOrder'];
};

function WedgeMatrixCreateForm({
  saveWedgeMatrix,
  editingWedgeMatrixId,
  cancelWedgeMatrixEdit,
  wedgeMatrixName,
  setWedgeMatrixName,
  wedgeMatrixClubs,
  toggleWedgeMatrixClub,
  wedgeMatrixSwingClocks,
  wedgeMatrixEnabledColumns,
  setWedgeMatrixSwingClockValue,
  setWedgeMatrixColumnEnabled,
  wedgeMatrixStanceWidth,
  setWedgeMatrixStanceWidth,
  wedgeMatrixGrip,
  setWedgeMatrixGrip,
  wedgeMatrixBallPosition,
  setWedgeMatrixBallPosition,
  wedgeMatrixNotes,
  setWedgeMatrixNotes,
}: WedgeMatrixCreateFormProps) {
  return (
    <form className="wedge-form" onSubmit={saveWedgeMatrix}>
      <div className="prototype-block">
        <label className="wedge-distance-field">
          Matrix name
          <input
            type="text"
            maxLength={80}
            value={wedgeMatrixName}
            onChange={(event) => setWedgeMatrixName(event.target.value)}
            placeholder="e.g. Narrow stance"
          />
        </label>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Clubs</h3>
        <div className="club-row" role="group" aria-label="Club selection">
          {CLUB_OPTIONS.map((club) => (
            <button
              type="button"
              key={club}
              className={wedgeMatrixClubs.includes(club) ? 'club-btn active' : 'club-btn'}
              onClick={() => toggleWedgeMatrixClub(club)}
            >
              {club}
            </button>
          ))}
        </div>
        <p className="hint">Pick the clubs you want in this matrix.</p>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Clock headings</h3>
        <div role="group" aria-label="Clock headings">
          {wedgeMatrixSwingClocks.map((clock, index) => (
            <div key={index} className="manual-save-row">
              <label className="wedge-distance-field">
                {`Column ${index + 1}`}
                <input
                  type="text"
                  maxLength={40}
                  value={clock}
                  disabled={index > 0 && !wedgeMatrixEnabledColumns[index]}
                  onChange={(event) => setWedgeMatrixSwingClockValue(index, event.target.value)}
                  placeholder={SWING_CLOCK_OPTIONS[index] || `Heading ${index + 1}`}
                />
              </label>
              {index > 0 ? (
                <button
                  type="button"
                  className={wedgeMatrixEnabledColumns[index] ? 'club-btn active' : 'club-btn'}
                  onClick={() => setWedgeMatrixColumnEnabled(index, !wedgeMatrixEnabledColumns[index])}
                >
                  {wedgeMatrixEnabledColumns[index] ? 'On' : 'Off'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <p className="hint">Column 1 is always on. Columns 2 to 4 can be toggled on or off.</p>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Stance width</h3>
        <div className="club-row" role="group" aria-label="Stance width">
          {['Short', 'Medium', 'Wide'].map((option) => (
            <button
              type="button"
              key={option}
              className={wedgeMatrixStanceWidth === option ? 'club-btn active' : 'club-btn'}
              onClick={() => setWedgeMatrixStanceWidth((prev) => (prev === option ? '' : option))}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Grip</h3>
        <div className="club-row" role="group" aria-label="Grip">
          {['Bottom', 'Mid', 'Normal'].map((option) => (
            <button
              type="button"
              key={option}
              className={wedgeMatrixGrip === option ? 'club-btn active' : 'club-btn'}
              onClick={() => setWedgeMatrixGrip((prev) => (prev === option ? '' : option))}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Ball position</h3>
        <div className="club-row" role="group" aria-label="Ball position">
          {['Forward', 'Middle', 'Back'].map((option) => (
            <button
              type="button"
              key={option}
              className={wedgeMatrixBallPosition === option ? 'club-btn active' : 'club-btn'}
              onClick={() => setWedgeMatrixBallPosition((prev) => (prev === option ? '' : option))}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="prototype-block">
        <label className="wedge-distance-field">
          Notes
          <textarea
            className="wedge-notes-input"
            rows={3}
            maxLength={400}
            value={wedgeMatrixNotes}
            onChange={(event) => setWedgeMatrixNotes(event.target.value)}
            placeholder="Anything else..."
          />
        </label>
      </div>
      <div className="manual-save-row">
        <button type="submit" className="save-btn">
          {editingWedgeMatrixId ? 'Save matrix changes' : 'Create matrix'}
        </button>
        {editingWedgeMatrixId ? (
          <button type="button" className="reset-btn" onClick={cancelWedgeMatrixEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  );
}

function WedgeEntryForm({
  addWedgeEntry,
  matrixClubs,
  matrixSwingClocks,
  wedgeClubSelection,
  toggleWedgeSelection,
  wedgeSwingClock,
  toggleWedgeSwingClock,
  wedgeDistanceUnit,
  setWedgeDistanceUnit,
  wedgeDistancePaces,
  setWedgeDistancePaces,
  wedgeDistanceMeters,
  setWedgeDistanceMeters,
  metersToPaces,
  pacesToMeters,
  editingWedgeEntryId,
  cancelWedgeEdit,
  wedgeEntryError,
  setIsWedgeFormOpen,
  setEditingWedgeEntryId,
}: WedgeEntryFormProps) {
  return (
    <form className="wedge-form" onSubmit={addWedgeEntry}>
      <div className="prototype-block">
        <h3 className="section-title">Club</h3>
        <div className="club-row" role="group" aria-label="Club selection">
          {matrixClubs.map((club) => (
            <button
              type="button"
              key={club}
              className={wedgeClubSelection === club ? 'club-btn active' : 'club-btn'}
              onClick={() => toggleWedgeSelection(club)}
            >
              {club}
            </button>
          ))}
        </div>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Clock system</h3>
        <div className="clock-row" role="group" aria-label="Swing clock">
          {matrixSwingClocks.map((clock) => (
            <button
              type="button"
              key={clock}
              className={wedgeSwingClock === clock ? 'clock-btn active' : 'clock-btn'}
              onClick={() => toggleWedgeSwingClock(clock)}
            >
              {clock}
            </button>
          ))}
        </div>
      </div>
      <div className="prototype-block">
        <h3 className="section-title">Distance</h3>
        <div className="unit-toggle" role="group" aria-label="Distance unit">
          <button
            type="button"
            className={wedgeDistanceUnit === 'meters' ? 'club-btn active' : 'club-btn'}
            onClick={() => {
              setWedgeDistanceUnit('meters');
              setWedgeDistanceMeters(pacesToMeters(wedgeDistancePaces));
            }}
          >
            Meters
          </button>
          <button
            type="button"
            className={wedgeDistanceUnit === 'paces' ? 'club-btn active' : 'club-btn'}
            onClick={() => {
              setWedgeDistanceUnit('paces');
              setWedgeDistancePaces(metersToPaces(wedgeDistanceMeters));
            }}
          >
            Paces
          </button>
        </div>
        {wedgeDistanceUnit === 'paces' ? (
          <>
            <div className="distance-header">
              <span>Paces</span>
              <strong>{wedgeDistancePaces}</strong>
            </div>
            <input
              type="range"
              min={metersToPaces(5)}
              max={metersToPaces(150)}
              step={1}
              value={wedgeDistancePaces}
              onChange={(event) => setWedgeDistancePaces(Number(event.target.value))}
            />
          </>
        ) : (
          <>
            <div className="distance-header">
              <span>Meters</span>
              <strong>{wedgeDistanceMeters}m</strong>
            </div>
            <input
              type="range"
              min={5}
              max={150}
              step={1}
              value={wedgeDistanceMeters}
              onChange={(event) => setWedgeDistanceMeters(Number(event.target.value))}
            />
          </>
        )}
      </div>
      <div className="manual-save-row">
        <button type="submit" className="save-btn">
          {editingWedgeEntryId ? 'Save changes' : 'Save wedge result'}
        </button>
        {editingWedgeEntryId ? (
          <button type="button" className="reset-btn" onClick={cancelWedgeEdit}>
            Cancel edit
          </button>
        ) : null}
        <button
          type="button"
          className="reset-btn"
          onClick={() => {
            setIsWedgeFormOpen(false);
            setEditingWedgeEntryId(null);
          }}
        >
          Close form
        </button>
      </div>
      {wedgeEntryError ? <p className="hint">{wedgeEntryError}</p> : null}
    </form>
  );
}

function WedgeMatrixCard({
  matrix,
  entries,
  wedgeMatrixMode,
  activeWedgeMatrixId,
  setActiveWedgeMatrixId,
  startWedgeMatrixEdit,
  setIsWedgeFormOpen,
  setEditingWedgeEntryId,
  recentEntriesMatrixId,
  setRecentEntriesMatrixId,
  setWedgeEntryError,
  deleteWedgeMatrix,
  isWedgeFormOpen,
  addWedgeEntry,
  wedgeClubSelection,
  toggleWedgeSelection,
  wedgeSwingClock,
  toggleWedgeSwingClock,
  wedgeDistanceUnit,
  setWedgeDistanceUnit,
  wedgeDistancePaces,
  setWedgeDistancePaces,
  wedgeDistanceMeters,
  setWedgeDistanceMeters,
  metersToPaces,
  pacesToMeters,
  editingWedgeEntryId,
  cancelWedgeEdit,
  wedgeEntryError,
  isLoadingWedgeEntries,
  wedgeEntriesError,
  wedgeEntrySaveState,
  startWedgeEdit,
  deleteWedgeEntry,
  buildWedgeMatrixRows,
  sortClubsByDefaultOrder,
}: WedgeMatrixCardProps) {
  const rows = buildWedgeMatrixRows(entries, matrix.clubs, matrix.swingClocks);
  const matrixClubs = sortClubsByDefaultOrder(matrix.clubs);
  const matrixSwingClocks =
    Array.isArray(matrix.swingClocks) && matrix.swingClocks.length > 0 ? matrix.swingClocks : SWING_CLOCK_OPTIONS;
  const recentEntries = entries.slice(0, 12);
  const isActiveMatrix = activeWedgeMatrixId === matrix.id;
  const isRecentEntriesOpen = recentEntriesMatrixId === matrix.id;

  return (
    <div className="wedge-matrix-card">
      <div className="wedge-matrix-header">
        <div>
          <h3 className="section-title">{matrix.name || 'Wedge matrix'}</h3>
          <p className="hint">
            Stance: {matrix.stanceWidth || '—'} | Grip: {matrix.grip || '—'} | Ball position: {matrix.ballPosition || '—'}
          </p>
          {matrix.notes ? <p className="hint">Notes: {matrix.notes}</p> : null}
        </div>
        {wedgeMatrixMode === 'setup' ? (
          <div className="wedge-matrix-actions">
            <button
              type="button"
              onClick={() => {
                setActiveWedgeMatrixId(matrix.id);
                setIsWedgeFormOpen(true);
                setEditingWedgeEntryId(null);
                setWedgeEntryError('');
              }}
            >
              Add wedge result
            </button>
            <button type="button" onClick={() => startWedgeMatrixEdit(matrix)}>
              Edit matrix
            </button>
            {recentEntries.length > 0 ? (
              <button
                type="button"
                onClick={() => setRecentEntriesMatrixId((prev) => (prev === matrix.id ? null : matrix.id))}
              >
                {isRecentEntriesOpen ? 'Close recent entries' : 'Edit recent entries'}
              </button>
            ) : null}
            <button type="button" className="reset-btn" onClick={() => deleteWedgeMatrix(matrix.id)}>
              Delete matrix
            </button>
          </div>
        ) : null}
      </div>
      {wedgeMatrixMode === 'setup' && isWedgeFormOpen && isActiveMatrix ? (
        <WedgeEntryForm
          addWedgeEntry={addWedgeEntry}
          matrixClubs={matrixClubs}
          matrixSwingClocks={matrixSwingClocks}
          wedgeClubSelection={wedgeClubSelection}
          toggleWedgeSelection={toggleWedgeSelection}
          wedgeSwingClock={wedgeSwingClock}
          toggleWedgeSwingClock={toggleWedgeSwingClock}
          wedgeDistanceUnit={wedgeDistanceUnit}
          setWedgeDistanceUnit={setWedgeDistanceUnit}
          wedgeDistancePaces={wedgeDistancePaces}
          setWedgeDistancePaces={setWedgeDistancePaces}
          wedgeDistanceMeters={wedgeDistanceMeters}
          setWedgeDistanceMeters={setWedgeDistanceMeters}
          metersToPaces={metersToPaces}
          pacesToMeters={pacesToMeters}
          editingWedgeEntryId={editingWedgeEntryId}
          cancelWedgeEdit={cancelWedgeEdit}
          wedgeEntryError={wedgeEntryError}
          setIsWedgeFormOpen={setIsWedgeFormOpen}
          setEditingWedgeEntryId={setEditingWedgeEntryId}
        />
      ) : null}
      <div className="wedge-matrix">
        <table className="wedge-matrix-table">
          <thead>
            <tr>
              <th>Club</th>
              {matrixSwingClocks.map((clock) => (
                <th key={clock}>{clock}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.club}>
                <td className="wedge-label">{row.club}</td>
                {row.cells.map((cell) => (
                  <td key={`${row.club}-${cell.clock}`}>
                    <div className="matrix-cell">
                      <span>{cell.avgMeters !== null ? `${cell.avgMeters}m` : '—'}</span>
                      {cell.count > 0 ? <span className="matrix-count">{cell.count} shots</span> : null}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoadingWedgeEntries ? <p className="hint">Loading wedge results...</p> : null}
        {!isLoadingWedgeEntries && wedgeEntriesError ? <p className="hint">{wedgeEntriesError}</p> : null}
        {!isLoadingWedgeEntries && !wedgeEntriesError && entries.length === 0 ? <p className="hint">No wedge results yet.</p> : null}
        {wedgeMatrixMode === 'setup' && wedgeEntrySaveState !== 'idle' ? <p className="hint">Wedge save: {wedgeEntrySaveState}</p> : null}
      </div>
      {wedgeMatrixMode === 'setup' && recentEntries.length > 0 && isRecentEntriesOpen ? (
        <div className="wedge-recent">
          <h3 className="section-title">Recent entries</h3>
          <div className="wedge-recent-list">
            {recentEntries.map((entry) => {
              const isPersisted = Number.isFinite(entry.id);
              return (
                <div key={entry.id} className="wedge-recent-row">
                  <div className="wedge-recent-meta">
                    <strong>{entry.club}</strong>
                    <span>{entry.swingClock}</span>
                    <span>{entry.distanceMeters}m</span>
                    {!isPersisted ? <span className="matrix-count">Saving...</span> : null}
                  </div>
                  <div className="wedge-recent-actions">
                    <button type="button" onClick={() => startWedgeEdit(entry)} disabled={!isPersisted}>
                      Edit
                    </button>
                    <button type="button" className="reset-btn" onClick={() => deleteWedgeEntry(entry.id, matrix.id)} disabled={!isPersisted}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WedgeMatrixPage({ state, actions, helpers }: WedgeMatrixPageProps) {
  const {
    wedgeMatrixMode,
    isWedgeMatrixFormOpen,
    editingWedgeMatrixId,
    wedgeMatrixName,
    wedgeMatrixClubs,
    wedgeMatrixSwingClocks,
    wedgeMatrixEnabledColumns,
    wedgeMatrixStanceWidth,
    wedgeMatrixGrip,
    wedgeMatrixBallPosition,
    wedgeMatrixNotes,
    isLoadingWedgeMatrices,
    wedgeMatricesError,
    wedgeMatrices,
    wedgeEntriesByMatrix,
    activeWedgeMatrixId,
    isWedgeFormOpen,
    wedgeClubSelection,
    wedgeSwingClock,
    wedgeDistanceUnit,
    wedgeDistancePaces,
    wedgeDistanceMeters,
    editingWedgeEntryId,
    recentEntriesMatrixId,
    wedgeEntryError,
    isLoadingWedgeEntries,
    wedgeEntriesError,
    wedgeEntrySaveState,
  } = state;
  const {
    setWedgeMatrixMode,
    setIsWedgeMatrixFormOpen,
    setWedgeMatricesError,
    saveWedgeMatrix,
    startWedgeMatrixEdit,
    cancelWedgeMatrixEdit,
    setWedgeMatrixName,
    toggleWedgeMatrixClub,
    setWedgeMatrixSwingClockValue,
    setWedgeMatrixColumnEnabled,
    setWedgeMatrixStanceWidth,
    setWedgeMatrixGrip,
    setWedgeMatrixBallPosition,
    setWedgeMatrixNotes,
    setActiveWedgeMatrixId,
    setIsWedgeFormOpen,
    setEditingWedgeEntryId,
    setRecentEntriesMatrixId,
    setWedgeEntryError,
    deleteWedgeMatrix,
    addWedgeEntry,
    toggleWedgeSelection,
    toggleWedgeSwingClock,
    setWedgeDistanceUnit,
    setWedgeDistancePaces,
    setWedgeDistanceMeters,
    cancelWedgeEdit,
    startWedgeEdit,
    deleteWedgeEntry,
  } = actions;
  const { buildWedgeMatrixRows, sortClubsByDefaultOrder, metersToPaces, pacesToMeters } = helpers;
  return (
    <section className="card" aria-label="wedge matrix">
      <div className="card-header">
        <h2>Wedge matrix</h2>
      </div>
      <p className="hint">Capture wedge distances by clock system and compare setups.</p>
      {wedgeMatrixMode === 'setup' ? (
        <div className="manual-save-row">
          <button
            onClick={() => {
              setIsWedgeMatrixFormOpen((prev) => !prev);
              setWedgeMatricesError('');
              if (isWedgeMatrixFormOpen && editingWedgeMatrixId) {
                cancelWedgeMatrixEdit();
              }
            }}
          >
            {isWedgeMatrixFormOpen ? 'Close matrix form' : 'Create new matrix'}
          </button>
        </div>
      ) : null}
      {wedgeMatrixMode === 'setup' && isWedgeMatrixFormOpen ? (
        <WedgeMatrixCreateForm
          saveWedgeMatrix={saveWedgeMatrix}
          editingWedgeMatrixId={editingWedgeMatrixId}
          cancelWedgeMatrixEdit={cancelWedgeMatrixEdit}
          wedgeMatrixName={wedgeMatrixName}
          setWedgeMatrixName={setWedgeMatrixName}
          wedgeMatrixClubs={wedgeMatrixClubs}
          toggleWedgeMatrixClub={toggleWedgeMatrixClub}
          wedgeMatrixSwingClocks={wedgeMatrixSwingClocks}
          wedgeMatrixEnabledColumns={wedgeMatrixEnabledColumns}
          setWedgeMatrixSwingClockValue={setWedgeMatrixSwingClockValue}
          setWedgeMatrixColumnEnabled={setWedgeMatrixColumnEnabled}
          wedgeMatrixStanceWidth={wedgeMatrixStanceWidth}
          setWedgeMatrixStanceWidth={setWedgeMatrixStanceWidth}
          wedgeMatrixGrip={wedgeMatrixGrip}
          setWedgeMatrixGrip={setWedgeMatrixGrip}
          wedgeMatrixBallPosition={wedgeMatrixBallPosition}
          setWedgeMatrixBallPosition={setWedgeMatrixBallPosition}
          wedgeMatrixNotes={wedgeMatrixNotes}
          setWedgeMatrixNotes={setWedgeMatrixNotes}
        />
      ) : null}
      {isLoadingWedgeMatrices ? <p className="hint">Loading wedge matrices...</p> : null}
      {!isLoadingWedgeMatrices && wedgeMatricesError ? <p className="hint">{wedgeMatricesError}</p> : null}
      {wedgeMatrices.length === 0 ? <p className="hint">No wedge matrices yet.</p> : null}
      {wedgeMatrices.map((matrix) => {
        return (
          <WedgeMatrixCard
            key={matrix.id}
            matrix={matrix}
            entries={wedgeEntriesByMatrix[matrix.id] || []}
            wedgeMatrixMode={wedgeMatrixMode}
            activeWedgeMatrixId={activeWedgeMatrixId}
            setActiveWedgeMatrixId={setActiveWedgeMatrixId}
            startWedgeMatrixEdit={startWedgeMatrixEdit}
            setIsWedgeFormOpen={setIsWedgeFormOpen}
            setEditingWedgeEntryId={setEditingWedgeEntryId}
            recentEntriesMatrixId={recentEntriesMatrixId}
            setRecentEntriesMatrixId={setRecentEntriesMatrixId}
            setWedgeEntryError={setWedgeEntryError}
            deleteWedgeMatrix={deleteWedgeMatrix}
            isWedgeFormOpen={isWedgeFormOpen}
            addWedgeEntry={addWedgeEntry}
            wedgeClubSelection={wedgeClubSelection}
            toggleWedgeSelection={toggleWedgeSelection}
            wedgeSwingClock={wedgeSwingClock}
            toggleWedgeSwingClock={toggleWedgeSwingClock}
            wedgeDistanceUnit={wedgeDistanceUnit}
            setWedgeDistanceUnit={setWedgeDistanceUnit}
            wedgeDistancePaces={wedgeDistancePaces}
            setWedgeDistancePaces={setWedgeDistancePaces}
            wedgeDistanceMeters={wedgeDistanceMeters}
            setWedgeDistanceMeters={setWedgeDistanceMeters}
            metersToPaces={metersToPaces}
            pacesToMeters={pacesToMeters}
            editingWedgeEntryId={editingWedgeEntryId}
            cancelWedgeEdit={cancelWedgeEdit}
            wedgeEntryError={wedgeEntryError}
            isLoadingWedgeEntries={isLoadingWedgeEntries}
            wedgeEntriesError={wedgeEntriesError}
            wedgeEntrySaveState={wedgeEntrySaveState}
            startWedgeEdit={startWedgeEdit}
            deleteWedgeEntry={deleteWedgeEntry}
            buildWedgeMatrixRows={buildWedgeMatrixRows}
            sortClubsByDefaultOrder={sortClubsByDefaultOrder}
          />
        );
      })}
      <div className="setup-footer">
        {wedgeMatrixMode === 'setup' ? (
          <button
            type="button"
            className="setup-toggle"
            onClick={() => {
              setWedgeMatrixMode('view');
              setIsWedgeFormOpen(false);
              setEditingWedgeMatrixId(null);
              setEditingWedgeEntryId(null);
              setRecentEntriesMatrixId(null);
            }}
          >
            Close setup
          </button>
        ) : (
          <button
            type="button"
            className="setup-toggle"
            onClick={() => {
              setWedgeMatrixMode('setup');
              setRecentEntriesMatrixId(null);
            }}
          >
            Set up
          </button>
        )}
      </div>
    </section>
  );
}
