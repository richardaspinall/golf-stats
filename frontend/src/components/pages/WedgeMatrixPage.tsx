import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CLUB_OPTIONS, SWING_CLOCK_OPTIONS } from '../../lib/constants';
import type { WedgeMatrixRow } from '../../lib/wedgeMatrix';
import type { WedgeEntry, WedgeMatrix } from '../../types';

type WedgeEntriesByMatrix = Record<number, WedgeEntry[]>;

const WEDGE_METER_PRESETS = [30, 50, 75, 100, 125, 150, 175, 200];
const PUTTER_METER_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30];

type Props = {
  state: {
    wedgeMatrixMode: string;
    isWedgeMatrixFormOpen: boolean;
    editingWedgeMatrixId: number | null;
    wedgeMatrixName: string;
    wedgeMatrixGroupName: string;
    wedgeMatrixGroups: string[];
    selectedWedgeMatrixGroup: string;
    wedgeMatrixClubs: string[];
    wedgeMatrixSwingClocks: string[];
    wedgeMatrixEnabledColumns: boolean[];
    wedgeMatrixStanceWidth: string;
    wedgeMatrixGrip: string;
    wedgeMatrixBallPosition: string;
    wedgeMatrixNotes: string;
    wedgeMatrixCurrentRoundAdjustments: string;
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
    showBackToVirtualCaddy: boolean;
  };
  actions: {
    setWedgeMatrixMode: (value: string) => void;
    setIsWedgeMatrixFormOpen: (value: boolean) => void;
    setWedgeMatricesError: (value: string) => void;
    saveWedgeMatrix: (event: FormEvent<HTMLFormElement>) => void;
    startWedgeMatrixEdit: (matrix: WedgeMatrix) => void;
    cancelWedgeMatrixEdit: () => void;
    setWedgeMatrixName: (value: string) => void;
    setWedgeMatrixGroupName: (value: string) => void;
    addWedgeMatrixGroup: (value: string) => void;
    deleteWedgeMatrixGroup: (value: string) => void;
    moveWedgeMatrixGroup: (groups: string[], group: string, direction: 'up' | 'down') => void;
    setSelectedWedgeMatrixGroup: (value: string) => void;
    toggleWedgeMatrixClub: (club: string) => void;
    setWedgeMatrixSwingClockValue: (index: number, value: string) => void;
    setWedgeMatrixColumnEnabled: (index: number, enabled: boolean) => void;
    setWedgeMatrixStanceWidth: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixGrip: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixBallPosition: (value: string | ((prev: string) => string)) => void;
    setWedgeMatrixNotes: (value: string) => void;
    setWedgeMatrixCurrentRoundAdjustments: (value: string) => void;
    setActiveWedgeMatrixId: (value: number | null) => void;
    setIsWedgeFormOpen: (value: boolean) => void;
    setEditingWedgeEntryId: (value: number | null) => void;
    setRecentEntriesMatrixId: (value: number | null | ((prev: number | null) => number | null)) => void;
    setWedgeEntryError: (value: string) => void;
    deleteWedgeMatrix: (matrixId: number) => void;
    moveWedgeMatrix: (matrixId: number, direction: 'up' | 'down') => void;
    clearCurrentRoundAdjustments: (matrixId: number) => void;
    addWedgeEntry: (event: FormEvent<HTMLFormElement>) => void;
    toggleWedgeSelection: (club: string) => void;
    toggleWedgeSwingClock: (clock: string) => void;
    setWedgeDistanceUnit: (value: string) => void;
    setWedgeDistancePaces: (value: number) => void;
    setWedgeDistanceMeters: (value: number) => void;
    cancelWedgeEdit: () => void;
    startWedgeEdit: (entry: WedgeEntry) => void;
    deleteWedgeEntry: (entryId: number, matrixId: number) => void;
    onBackToVirtualCaddy?: () => void;
  };
  helpers: {
    buildWedgeMatrixRows: (entries: WedgeEntry[], clubs: string[], swingClocks: string[]) => WedgeMatrixRow[];
    sortClubsByDefaultOrder: (clubs: string[]) => string[];
    metersToPaces: (meters: number) => number;
    pacesToMeters: (paces: number) => number;
  };
};

const renderMultiLine = (value: string) => (
  <p className="hint" style={{ whiteSpace: 'pre-wrap' }}>
    {value}
  </p>
);

const formatDistanceSummary = (meters: number, metersToPaces: (meters: number) => number) => {
  if (!Number.isFinite(meters) || meters <= 0) {
    return 'Choose a distance';
  }

  return `${meters}m • ${metersToPaces(meters)} paces`;
};

export function WedgeMatrixPage({ state, actions, helpers }: Props) {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [isOrderingGroups, setIsOrderingGroups] = useState(false);
  const [isOrderingMatrices, setIsOrderingMatrices] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const wasMatrixFormOpen = useRef(state.isWedgeMatrixFormOpen);
  const groups = Array.from(
    new Set([...state.wedgeMatrixGroups, ...state.wedgeMatrices.map((matrix) => matrix.groupName || 'Ungrouped')].filter(Boolean)),
  );
  const selectedGroup = groups.includes(state.selectedWedgeMatrixGroup) ? state.selectedWedgeMatrixGroup : groups[0] || '';
  const visibleMatrices = state.wedgeMatrices
    .filter((matrix) => (matrix.groupName || 'Ungrouped') === selectedGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const adjustWedgeDistanceMeters = (delta: number, minMeters: number, maxMeters: number) => {
    actions.setWedgeDistanceMeters(Math.max(minMeters, Math.min(maxMeters, state.wedgeDistanceMeters + delta)));
  };
  const adjustWedgeDistancePaces = (delta: number, minMeters: number, maxMeters: number) => {
    const minPaces = helpers.metersToPaces(minMeters);
    const maxPaces = helpers.metersToPaces(maxMeters);
    actions.setWedgeDistancePaces(Math.max(minPaces, Math.min(maxPaces, state.wedgeDistancePaces + delta)));
  };

  useEffect(() => {
    if (wasMatrixFormOpen.current && !state.isWedgeMatrixFormOpen) {
      actions.setWedgeMatrixMode('view');
      setIsAddingGroup(true);
      setIsGroupEditorOpen(false);
    }
    wasMatrixFormOpen.current = state.isWedgeMatrixFormOpen;
  }, [actions, state.isWedgeMatrixFormOpen]);

  return (
    <section className="card" aria-label="matrixes">
      <div className="card-header close-header">
        <h2>Matrixes</h2>
        {state.showBackToVirtualCaddy && actions.onBackToVirtualCaddy ? (
          <button type="button" className="setup-toggle" onClick={actions.onBackToVirtualCaddy}>
            Back to virtual caddy
          </button>
        ) : null}
      </div>
      <div className="prototype-block">
        <div className="matrix-group-navigation">
          <div className="matrix-group-list" role="tablist" aria-label="Matrix groups">
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                className={selectedGroup === group ? 'club-btn active' : 'club-btn'}
                onClick={() => {
                  actions.setSelectedWedgeMatrixGroup(group);
                  actions.setActiveWedgeMatrixId(null);
                  actions.cancelWedgeEdit();
                  actions.setRecentEntriesMatrixId(null);
                  if (state.isWedgeMatrixFormOpen) {
                    actions.cancelWedgeMatrixEdit();
                  }
                }}
              >
                {group}
              </button>
            ))}
          </div>
          <div className="matrix-group-actions">
            <button
              type="button"
              className="icon-action-btn"
              aria-label="Matrix options"
              title="Matrix options"
              onClick={() => {
                if (isAddingGroup) {
                  setIsAddingGroup(false);
                  setIsGroupEditorOpen(false);
                  setIsOrderingGroups(false);
                } else {
                  setIsAddingGroup(true);
                }
                setIsOrderingMatrices(false);
                actions.setWedgeMatrixMode('view');
                actions.cancelWedgeMatrixEdit();
                actions.cancelWedgeEdit();
                actions.setRecentEntriesMatrixId(null);
                actions.setActiveWedgeMatrixId(null);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.54h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.54 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.54 1z" />
              </svg>
            </button>
          </div>
        </div>
        {state.wedgeMatrixMode === 'setup' && !isAddingGroup && !state.isWedgeMatrixFormOpen ? (
          <div className="manual-save-row">
            <button
              type="button"
              className="save-btn"
              onClick={() => {
                actions.setWedgeMatrixMode('view');
                actions.cancelWedgeMatrixEdit();
                actions.cancelWedgeEdit();
                actions.setRecentEntriesMatrixId(null);
                actions.setActiveWedgeMatrixId(null);
              }}
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                actions.setIsWedgeMatrixFormOpen(true);
                actions.setWedgeMatricesError('');
                actions.setWedgeMatrixGroupName(selectedGroup);
              }}
            >
              New matrix
            </button>
          </div>
        ) : null}
        {isAddingGroup ? (
          <div className="matrix-group-settings">
            {!isGroupEditorOpen ? (
              <div className="manual-save-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingGroup(false);
                    actions.setWedgeMatrixMode('setup');
                    actions.setWedgeMatrixGroupName(selectedGroup);
                    actions.setIsWedgeMatrixFormOpen(true);
                  }}
                >
                  Add matrix
                </button>
              <button
                type="button"
                onClick={() => {
                  setIsGroupEditorOpen(true);
                  setIsOrderingGroups(false);
                }}
              >
                Edit groups
              </button>
              <button
                type="button"
                disabled={visibleMatrices.length < 2}
                onClick={() => {
                  setIsOrderingMatrices(true);
                  setIsAddingGroup(false);
                  actions.cancelWedgeMatrixEdit();
                  actions.cancelWedgeEdit();
                  actions.setRecentEntriesMatrixId(null);
                }}
              >
                Order matrixes
              </button>
              </div>
            ) : isOrderingGroups ? (
              <div className="matrix-order-editor">
                <div className="wedge-matrix-header">
                  <h3 className="section-title">Order groups</h3>
                  <button type="button" className="icon-close-btn" aria-label="Close group ordering" onClick={() => setIsOrderingGroups(false)}>
                    ×
                  </button>
                </div>
                {groups.map((group, index) => (
                  <div key={group} className="wedge-recent-row">
                    <strong>{group}</strong>
                    <div className="wedge-recent-actions">
                      <button type="button" disabled={index === 0} onClick={() => actions.moveWedgeMatrixGroup(groups, group, 'up')}>Up</button>
                      <button type="button" disabled={index === groups.length - 1} onClick={() => actions.moveWedgeMatrixGroup(groups, group, 'down')}>Down</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="wedge-matrix-header">
                  <h3 className="section-title">Edit groups</h3>
                  <button type="button" className="icon-close-btn" aria-label="Close group editor" onClick={() => { setIsGroupEditorOpen(false); setIsOrderingGroups(false); }}>
                    ×
                  </button>
                </div>
                <div className="manual-save-row">
                  <button type="button" disabled={groups.length < 2} onClick={() => setIsOrderingGroups(true)}>
                    Order groups
                  </button>
                </div>
                <div className="manual-save-row">
                  <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} maxLength={80} placeholder="New group name" />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newGroupName.trim()) {
                        return;
                      }
                      actions.addWedgeMatrixGroup(newGroupName);
                      setNewGroupName('');
                    }}
                  >
                    Add group
                  </button>
                </div>
                {groups.length > 0 ? (
                  <div className="wedge-recent-list">
                    {groups.map((group) => {
                      const groupHasMatrices = state.wedgeMatrices.some((matrix) => (matrix.groupName || 'Ungrouped') === group);
                      return (
                        <div key={group} className="wedge-recent-row">
                          <strong>{group}</strong>
                          <button
                            type="button"
                            className="reset-btn"
                            disabled={groupHasMatrices}
                            title={groupHasMatrices ? 'Move or delete its matrixes before deleting this group.' : 'Delete group'}
                            onClick={() => actions.deleteWedgeMatrixGroup(group)}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {state.isWedgeMatrixFormOpen ? (
        <form className="wedge-form" onSubmit={actions.saveWedgeMatrix}>
          <div className="wedge-matrix-header">
            <h3 className="section-title">{state.editingWedgeMatrixId ? 'Edit matrix' : 'New matrix'}</h3>
            <button type="button" className="icon-close-btn" aria-label="Close matrix editor" onClick={actions.cancelWedgeMatrixEdit}>
              ×
            </button>
          </div>
          <div className="prototype-block matrix-identity-fields">
            <label className="wedge-distance-field">
              Group
              <select value={state.wedgeMatrixGroupName} onChange={(event) => actions.setWedgeMatrixGroupName(event.target.value)}>
                {groups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>
            <label className="wedge-distance-field">
              Name
              <input value={state.wedgeMatrixName} onChange={(event) => actions.setWedgeMatrixName(event.target.value)} maxLength={80} />
            </label>
          </div>
          <div className="prototype-block">
            <h3 className="section-title">Clubs</h3>
            <div className="club-row">
              {CLUB_OPTIONS.map((club) => (
                <button key={club} type="button" className={state.wedgeMatrixClubs.includes(club) ? 'club-btn active' : 'club-btn'} onClick={() => actions.toggleWedgeMatrixClub(club)}>
                  {club}
                </button>
              ))}
            </div>
          </div>
          <div className="prototype-block">
            <h3 className="section-title">Clock headings</h3>
            {state.wedgeMatrixSwingClocks.map((clock, index) => (
              <div key={index} className="manual-save-row">
                <input
                  value={clock}
                  maxLength={40}
                  disabled={index > 0 && !state.wedgeMatrixEnabledColumns[index]}
                  onChange={(event) => actions.setWedgeMatrixSwingClockValue(index, event.target.value)}
                  placeholder={SWING_CLOCK_OPTIONS[index]}
                />
                {index > 0 ? (
                  <button type="button" className={state.wedgeMatrixEnabledColumns[index] ? 'club-btn active' : 'club-btn'} onClick={() => actions.setWedgeMatrixColumnEnabled(index, !state.wedgeMatrixEnabledColumns[index])}>
                    {state.wedgeMatrixEnabledColumns[index] ? 'On' : 'Off'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="prototype-block">
            <h3 className="section-title">Stance</h3>
            <div className="club-row">
              {['Short', 'Medium', 'Wide'].map((option) => (
                <button key={option} type="button" className={state.wedgeMatrixStanceWidth === option ? 'club-btn active' : 'club-btn'} onClick={() => actions.setWedgeMatrixStanceWidth((prev) => (prev === option ? '' : option))}>
                  {option}
                </button>
              ))}
            </div>
            <h3 className="section-title">Grip</h3>
            <div className="club-row">
              {['Bottom', 'Mid', 'Normal'].map((option) => (
                <button key={option} type="button" className={state.wedgeMatrixGrip === option ? 'club-btn active' : 'club-btn'} onClick={() => actions.setWedgeMatrixGrip((prev) => (prev === option ? '' : option))}>
                  {option}
                </button>
              ))}
            </div>
            <h3 className="section-title">Ball position</h3>
            <div className="club-row">
              {['Forward', 'Middle', 'Back'].map((option) => (
                <button key={option} type="button" className={state.wedgeMatrixBallPosition === option ? 'club-btn active' : 'club-btn'} onClick={() => actions.setWedgeMatrixBallPosition((prev) => (prev === option ? '' : option))}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="prototype-block">
            <label className="wedge-distance-field">
              Current round adjustments
              <textarea className="wedge-notes-input" rows={3} value={state.wedgeMatrixCurrentRoundAdjustments} onChange={(event) => actions.setWedgeMatrixCurrentRoundAdjustments(event.target.value)} placeholder="Greens running fast" />
            </label>
          </div>
          <div className="manual-save-row">
            <button type="submit" className="save-btn">
              Save matrix
            </button>
            {state.editingWedgeMatrixId ? (
              <button type="button" className="reset-btn" onClick={() => actions.deleteWedgeMatrix(state.editingWedgeMatrixId!)}>
                Delete matrix
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {state.isLoadingWedgeMatrices ? <p className="hint">Loading matrixes...</p> : null}
      {!state.isLoadingWedgeMatrices && state.wedgeMatricesError ? <p className="hint">{state.wedgeMatricesError}</p> : null}
      {!state.isLoadingWedgeMatrices && !state.isWedgeMatrixFormOpen && !isOrderingMatrices && visibleMatrices.length === 0 ? <p className="hint">No matrixes in this group yet.</p> : null}

      {isOrderingMatrices ? (
        <div className="matrix-order-editor">
          <div className="wedge-matrix-header">
            <h3 className="section-title">Order matrixes</h3>
            <button type="button" className="icon-close-btn" aria-label="Close matrix ordering" onClick={() => setIsOrderingMatrices(false)}>
              ×
            </button>
          </div>
          {visibleMatrices.map((matrix, index) => (
            <div key={matrix.id} className="wedge-recent-row">
              <strong>{matrix.name || 'Matrix'}</strong>
              <div className="wedge-recent-actions">
                <button type="button" disabled={index === 0} onClick={() => actions.moveWedgeMatrix(matrix.id, 'up')}>Up</button>
                <button type="button" disabled={index === visibleMatrices.length - 1} onClick={() => actions.moveWedgeMatrix(matrix.id, 'down')}>Down</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!state.isWedgeMatrixFormOpen && !isOrderingMatrices &&
        visibleMatrices.map((matrix) => {
          const entries = state.wedgeEntriesByMatrix[matrix.id] || [];
          const rows = helpers.buildWedgeMatrixRows(entries, matrix.clubs, matrix.swingClocks);
          const matrixClubs = helpers.sortClubsByDefaultOrder(matrix.clubs);
          const isPutterOnlyMatrix = matrixClubs.length === 1 && matrixClubs[0] === 'Putter';
          const minDistanceMeters = isPutterOnlyMatrix ? 1 : 5;
          const maxDistanceMeters = isPutterOnlyMatrix ? 30 : 300;
          const meterPresets = isPutterOnlyMatrix ? PUTTER_METER_PRESETS : WEDGE_METER_PRESETS;
          const pacePresets = meterPresets.map((meters) => helpers.metersToPaces(meters));
          const isActive = state.activeWedgeMatrixId === matrix.id;
          const isRecentOpen = state.recentEntriesMatrixId === matrix.id;

          return (
            <div key={matrix.id} className="wedge-matrix-card">
              <div className="wedge-matrix-header">
                <div>
                  <h3 className="section-title">{matrix.name || 'Matrix'}</h3>
                  {[matrix.stanceWidth, matrix.grip, matrix.ballPosition].some(Boolean) ? (
                    <p className="hint">{[matrix.stanceWidth, matrix.grip, matrix.ballPosition].filter(Boolean).join(' | ')}</p>
                  ) : null}
                </div>
                <div className="wedge-matrix-actions">
                  <button
                    type="button"
                    onClick={() => {
                      const isOpening = !isActive || !state.isWedgeFormOpen;
                      actions.setActiveWedgeMatrixId(matrix.id);
                      actions.setIsWedgeFormOpen(!(isActive && state.isWedgeFormOpen));
                      actions.setEditingWedgeEntryId(null);
                      actions.setWedgeEntryError('');
                      if (isOpening && state.wedgeDistanceUnit === 'meters') {
                        actions.setWedgeDistanceMeters(Math.max(minDistanceMeters, Math.min(maxDistanceMeters, state.wedgeDistanceMeters)));
                      }
                      if (isOpening && state.wedgeDistanceUnit === 'paces') {
                        const minPaces = helpers.metersToPaces(minDistanceMeters);
                        const maxPaces = helpers.metersToPaces(maxDistanceMeters);
                        actions.setWedgeDistancePaces(Math.max(minPaces, Math.min(maxPaces, state.wedgeDistancePaces)));
                      }
                    }}
                  >
                    {isActive && state.isWedgeFormOpen ? 'Cancel' : 'Add result'}
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    aria-label={`Edit ${matrix.name || 'matrix'}`}
                    title="Edit matrix"
                    onClick={() => {
                      actions.setWedgeMatrixMode('setup');
                      actions.startWedgeMatrixEdit(matrix);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.54h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.54 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.54 1z" />
                    </svg>
                  </button>
                </div>
              </div>

              {matrix.currentRoundAdjustments ? (
                <div className="prototype-block">
                  <div className="manual-save-row">
                    <h3 className="section-title">Current round adjustments</h3>
                    <button type="button" className="reset-btn" onClick={() => actions.clearCurrentRoundAdjustments(matrix.id)}>
                      Clear
                    </button>
                  </div>
                  {renderMultiLine(matrix.currentRoundAdjustments)}
                </div>
              ) : null}

              {state.isWedgeFormOpen && isActive ? (
                <form className="wedge-form active-panel" onSubmit={actions.addWedgeEntry}>
                  <div className="prototype-block">
                    <h3 className="section-title">Club</h3>
                    <div className="club-row">
                      {matrixClubs.map((club) => (
                        <button key={club} type="button" className={state.wedgeClubSelection === club ? 'club-btn active' : 'club-btn'} onClick={() => actions.toggleWedgeSelection(club)}>
                          {club}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="prototype-block">
                    <h3 className="section-title">Swing</h3>
                    <div className="clock-row">
                      {matrix.swingClocks.map((clock) => (
                        <button key={clock} type="button" className={state.wedgeSwingClock === clock ? 'clock-btn active' : 'clock-btn'} onClick={() => actions.toggleWedgeSwingClock(clock)}>
                          {clock}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="prototype-block">
                    <h3 className="section-title">Actual distance</h3>
                    <div className="unit-toggle" role="group" aria-label="Wedge distance unit">
                      <button
                        type="button"
                        className={state.wedgeDistanceUnit === 'meters' ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => {
                          actions.setWedgeDistanceUnit('meters');
                          actions.setWedgeDistanceMeters(helpers.pacesToMeters(state.wedgeDistancePaces));
                        }}
                      >
                        Meters
                      </button>
                      <button
                        type="button"
                        className={state.wedgeDistanceUnit === 'paces' ? 'choice-chip active' : 'choice-chip'}
                        onClick={() => {
                          actions.setWedgeDistanceUnit('paces');
                          actions.setWedgeDistancePaces(helpers.metersToPaces(state.wedgeDistanceMeters));
                        }}
                      >
                        Paces
                      </button>
                    </div>
                    {state.wedgeDistanceUnit === 'paces' ? (
                      <>
                        <div className="preset-row" role="group" aria-label="Wedge pace presets">
                          {pacePresets.map((preset, index) => (
                            <button
                              key={`${preset}-${index}`}
                              type="button"
                              className={state.wedgeDistancePaces === preset ? 'choice-chip active' : 'choice-chip'}
                              onClick={() => actions.setWedgeDistancePaces(preset)}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <div className="distance-header">
                          <span>Distance</span>
                          <div className="distance-value-actions">
                            <button type="button" onClick={() => adjustWedgeDistancePaces(-1, minDistanceMeters, maxDistanceMeters)} aria-label="Decrease paces">
                              -
                            </button>
                            <strong>{state.wedgeDistancePaces}</strong>
                            <button type="button" onClick={() => adjustWedgeDistancePaces(1, minDistanceMeters, maxDistanceMeters)} aria-label="Increase paces">
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={helpers.metersToPaces(minDistanceMeters)}
                          max={helpers.metersToPaces(maxDistanceMeters)}
                          step={1}
                          value={state.wedgeDistancePaces}
                          onChange={(event) => actions.setWedgeDistancePaces(Number(event.target.value))}
                        />
                      </>
                    ) : (
                      <>
                        <div className="preset-row" role="group" aria-label="Wedge meter presets">
                          {meterPresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={state.wedgeDistanceMeters === preset ? 'choice-chip active' : 'choice-chip'}
                              onClick={() => actions.setWedgeDistanceMeters(preset)}
                            >
                              {preset}m
                            </button>
                          ))}
                        </div>
                        <div className="distance-header">
                          <span>Distance</span>
                          <div className="distance-value-actions">
                            <button type="button" onClick={() => adjustWedgeDistanceMeters(-1, minDistanceMeters, maxDistanceMeters)} aria-label="Decrease meters">
                              -
                            </button>
                            <strong>{state.wedgeDistanceMeters}m</strong>
                            <button type="button" onClick={() => adjustWedgeDistanceMeters(1, minDistanceMeters, maxDistanceMeters)} aria-label="Increase meters">
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={minDistanceMeters}
                          max={maxDistanceMeters}
                          step={1}
                          value={state.wedgeDistanceMeters}
                          onChange={(event) => actions.setWedgeDistanceMeters(Number(event.target.value))}
                        />
                      </>
                    )}
                  </div>
                  <div className="manual-save-row">
                    <button type="submit" className="save-btn">Save result</button>
                    <button type="button" className="reset-btn" onClick={actions.cancelWedgeEdit}>Cancel</button>
                  </div>
                  {state.wedgeEntryError ? <p className="hint">{state.wedgeEntryError}</p> : null}
                </form>
              ) : null}

              <div className="wedge-matrix">
                <table className="wedge-matrix-table">
                  <thead>
                    <tr>
                      <th>Club</th>
                      {matrix.swingClocks.map((clock) => (
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
                            {cell.avgMeters !== null || cell.count > 0 ? (
                              <div className="matrix-cell">
                                {cell.avgMeters !== null ? <span>{cell.avgMeters}m</span> : null}
                                {cell.count > 0 ? <span className="matrix-count">{cell.count} shots</span> : null}
                              </div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {entries.length > 0 && state.wedgeMatrixMode === 'setup' ? (
                <div className="manual-save-row">
                  <button type="button" onClick={() => actions.setRecentEntriesMatrixId((prev) => (prev === matrix.id ? null : matrix.id))}>
                    {isRecentOpen ? 'Hide results' : 'View results'}
                  </button>
                </div>
              ) : null}

              {isRecentOpen ? (
                <div className="wedge-recent-list">
                  {entries.slice(0, 12).map((entry) => (
                    <div key={entry.id} className="wedge-recent-row">
                      <div className="wedge-recent-meta">
                        <strong>{entry.club}</strong>
                        <span>{entry.swingClock}</span>
                        <span>{formatDistanceSummary(entry.distanceMeters, helpers.metersToPaces)}</span>
                      </div>
                      {state.wedgeMatrixMode === 'setup' ? (
                        <div className="wedge-recent-actions">
                          <button type="button" onClick={() => { actions.setActiveWedgeMatrixId(matrix.id); actions.startWedgeEdit(entry); }}>
                            Edit
                          </button>
                          <button type="button" className="reset-btn" onClick={() => actions.deleteWedgeEntry(entry.id, matrix.id)}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

      {state.isLoadingWedgeEntries ? <p className="hint">Loading matrix entries...</p> : null}
      {!state.isLoadingWedgeEntries && state.wedgeEntriesError ? <p className="hint">{state.wedgeEntriesError}</p> : null}
      {state.wedgeEntrySaveState !== 'idle' ? <p className="hint">Entry save: {state.wedgeEntrySaveState}</p> : null}
    </section>
  );
}
