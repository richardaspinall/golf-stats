import React, { useEffect, useMemo, useRef, useState } from 'react';

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_ROUNDS_URL = `${API_BASE_URL}/api/rounds`;
const sanitizeNoteText = (raw) => String(raw || '').trim().slice(0, 1000);
const sanitizeNotesList = (raw) => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((note) => sanitizeNoteText(note)).filter(Boolean).slice(0, 300);
};

const COUNTER_SECTIONS = [
  {
    title: 'Inside 100 (Over 3 within 100m score)',
    options: [
      { key: 'inside100Over3', label: 'Over 3' },
      { key: 'inside100Bunkers', label: 'Bunkers' },
      { key: 'inside100Wedges', label: 'Wedges' },
      { key: 'inside100ChipShots', label: 'Chip shots' },
    ],
  },
  {
    title: 'Out of Position (OOP)',
    options: [
      { key: 'oopLook', label: 'Look' },
      { key: 'oopNoLook', label: 'No look' },
    ],
  },
];

const FAIRWAY_SECTION = {
  title: 'Fairway Hit',
  options: [
    { key: 'fairwayHit', label: 'Hit', position: 'center' },
    { key: 'fairwayLeft', label: 'Left', position: 'left' },
    { key: 'fairwayRight', label: 'Right', position: 'right' },
  ],
};

const GIR_SECTION = {
  title: 'Green in Regulation',
  options: [
    { key: 'girHit', label: 'Hit', position: 'center' },
    { key: 'girLeft', label: 'Left', position: 'left' },
    { key: 'girRight', label: 'Right', position: 'right' },
    { key: 'girLong', label: 'Long', position: 'long' },
    { key: 'girShort', label: 'Short', position: 'short' },
  ],
};

const STAT_SECTIONS = [
  ...COUNTER_SECTIONS,
  {
    title: FAIRWAY_SECTION.title,
    options: FAIRWAY_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
  {
    title: GIR_SECTION.title,
    options: GIR_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
];

const COUNTER_OPTIONS = COUNTER_SECTIONS.flatMap((section) => section.options);
const FAIRWAY_KEYS = FAIRWAY_SECTION.options.map((option) => option.key);
const VALID_FAIRWAY_KEYS = new Set(FAIRWAY_KEYS);
const GIR_KEYS = GIR_SECTION.options.map((option) => option.key);
const VALID_GIR_KEYS = new Set(GIR_KEYS);
const TOTAL_OPTIONS = [...COUNTER_OPTIONS, ...FAIRWAY_SECTION.options, ...GIR_SECTION.options];

const emptyHoleStats = () =>
  COUNTER_OPTIONS.reduce((acc, option) => {
    acc[option.key] = 0;
    return acc;
  }, { fairwaySelection: null, girSelection: null });

const emptyTotals = () =>
  TOTAL_OPTIONS.reduce((acc, option) => {
    acc[option.key] = 0;
    return acc;
  }, {});

const buildInitialByHole = () =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = emptyHoleStats();
    return acc;
  }, {});

const sanitizeStats = (raw) => {
  const safe = buildInitialByHole();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    if (!raw[hole] || typeof raw[hole] !== 'object') {
      return;
    }

    COUNTER_OPTIONS.forEach(({ key }) => {
      const value = Number(raw[hole][key]);
      safe[hole][key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    const fairwaySelection = raw[hole].fairwaySelection;
    safe[hole].fairwaySelection = VALID_FAIRWAY_KEYS.has(fairwaySelection) ? fairwaySelection : null;

    const girSelection = raw[hole].girSelection;
    safe[hole].girSelection = VALID_GIR_KEYS.has(girSelection) ? girSelection : null;
  });

  return safe;
};

const loadRoundsFromApi = async () => {
  const response = await fetch(API_ROUNDS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load rounds (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data?.rounds) ? data.rounds : [];
};

const loadRoundFromApi = async (roundId) => {
  const response = await fetch(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`);
  if (!response.ok) {
    throw new Error(`Failed to load round (${response.status})`);
  }

  const data = await response.json();
  return data?.round;
};

const saveRoundToApi = async (roundId, statsByHole, notes) => {
  const response = await fetch(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statsByHole, notes }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save round (${response.status})`);
  }

  const data = await response.json();
  return data?.round;
};

const createRoundInApi = async (name) => {
  const response = await fetch(API_ROUNDS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create round (${response.status})`);
  }

  const data = await response.json();
  return data?.round;
};

export default function App() {
  const [selectedHole, setSelectedHole] = useState(1);
  const [page, setPage] = useState('track');
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newRoundDate, setNewRoundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showNewRoundForm, setShowNewRoundForm] = useState(false);
  const [statsByHole, setStatsByHole] = useState(() => buildInitialByHole());
  const [roundNotes, setRoundNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [saveState, setSaveState] = useState('loading');
  const [isSwitchingRound, setIsSwitchingRound] = useState(false);

  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  const holeStats = statsByHole[selectedHole];
  const activeRound = rounds.find((round) => round.id === selectedRoundId);

  const applyRoundToState = (round) => {
    skipNextSaveRef.current = true;
    hasLoadedRef.current = true;
    setSelectedRoundId(round.id);
    setStatsByHole(sanitizeStats(round.statsByHole));
    setRoundNotes(sanitizeNotesList(round.notes));
    setNoteDraft('');
    setSaveState('saved');
  };

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      try {
        const list = await loadRoundsFromApi();
        if (!isActive || list.length === 0) {
          return;
        }

        setRounds(list);
        const firstRound = await loadRoundFromApi(list[0].id);
        if (!isActive || !firstRound) {
          return;
        }

        applyRoundToState(firstRound);
      } catch {
        if (!isActive) {
          return;
        }

        hasLoadedRef.current = true;
        setSaveState('error');
      }
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current || !selectedRoundId) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setSaveState('saving');
    const timeoutId = setTimeout(async () => {
      try {
        const savedRound = await saveRoundToApi(selectedRoundId, statsByHole, roundNotes);
        setSaveState('saved');
        setRounds((prev) =>
          prev.map((round) =>
            round.id === selectedRoundId
              ? {
                  ...round,
                  name: savedRound?.name ?? round.name,
                  updatedAt: savedRound?.updatedAt ?? round.updatedAt,
                }
              : round,
          ),
        );
      } catch {
        setSaveState('error');
      }
    }, 180);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedRoundId, statsByHole, roundNotes]);

  const switchRound = async (roundId) => {
    if (!roundId || roundId === selectedRoundId) {
      return;
    }

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      const round = await loadRoundFromApi(roundId);
      if (round) {
        applyRoundToState(round);
      }
    } catch {
      setSaveState('error');
    } finally {
      setIsSwitchingRound(false);
    }
  };

  const createRound = async (event) => {
    event?.preventDefault();
    const courseName = newCourseName.trim();
    const roundDate = newRoundDate || new Date().toISOString().slice(0, 10);
    const roundName = courseName ? `${courseName} - ${roundDate}` : `Round ${roundDate}`;

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      const round = await createRoundInApi(roundName);
      if (round) {
        const summary = {
          id: round.id,
          name: round.name,
          createdAt: round.createdAt,
          updatedAt: round.updatedAt,
        };
        setRounds((prev) => [summary, ...prev]);
        setNewCourseName('');
        setShowNewRoundForm(false);
        applyRoundToState(round);
      }
    } catch {
      setSaveState('error');
    } finally {
      setIsSwitchingRound(false);
    }
  };

  const totals = useMemo(() => {
    return HOLES.reduce(
      (acc, hole) => {
        COUNTER_OPTIONS.forEach(({ key }) => {
          acc[key] += statsByHole[hole][key];
        });

        const fairwaySelection = statsByHole[hole].fairwaySelection;
        if (VALID_FAIRWAY_KEYS.has(fairwaySelection)) {
          acc[fairwaySelection] += 1;
        }

        const girSelection = statsByHole[hole].girSelection;
        if (VALID_GIR_KEYS.has(girSelection)) {
          acc[girSelection] += 1;
        }
        return acc;
      },
      emptyTotals(),
    );
  }, [statsByHole]);

  const updateStats = (hole, statKey, delta) => {
    setStatsByHole((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        [statKey]: Math.max(0, prev[hole][statKey] + delta),
      },
    }));
  };

  const setGirSelection = (hole, girKey) => {
    setStatsByHole((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        girSelection: prev[hole].girSelection === girKey ? null : girKey,
      },
    }));
  };

  const setFairwaySelection = (hole, fairwayKey) => {
    setStatsByHole((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        fairwaySelection: prev[hole].fairwaySelection === fairwayKey ? null : fairwayKey,
      },
    }));
  };

  const resetRound = () => {
    setStatsByHole(buildInitialByHole());
  };

  const addNote = (event) => {
    event?.preventDefault();
    const next = sanitizeNoteText(noteDraft);
    if (!next) {
      return;
    }

    setRoundNotes((prev) => [...prev, next]);
    setNoteDraft('');
  };

  const deleteNote = (indexToDelete) => {
    setRoundNotes((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  return (
    <main className="app">
      <header className="header">
        <h1>Golf Stat Tracker</h1>
        {!showNewRoundForm ? (
          <div className="header-controls">
            <select
              className="round-select"
              value={selectedRoundId}
              onChange={(event) => switchRound(event.target.value)}
              disabled={isSwitchingRound || rounds.length === 0}
            >
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))}
            </select>
            <button onClick={() => setShowNewRoundForm(true)} disabled={isSwitchingRound}>
              New round
            </button>
            <button className="reset-btn" onClick={resetRound} disabled={!selectedRoundId || isSwitchingRound}>
              Reset round
            </button>
          </div>
        ) : null}
      </header>
      {showNewRoundForm ? (
        <form className="new-round-form card" onSubmit={createRound}>
          <h2>Create round</h2>
          <div className="new-round-fields">
            <input
              type="text"
              value={newCourseName}
              onChange={(event) => setNewCourseName(event.target.value)}
              placeholder="Course name"
              maxLength={80}
            />
            <input
              type="date"
              value={newRoundDate}
              onChange={(event) => setNewRoundDate(event.target.value)}
            />
          </div>
          <div className="new-round-actions">
            <button type="submit" disabled={isSwitchingRound}>
              Create
            </button>
            <button type="button" onClick={() => setShowNewRoundForm(false)} disabled={isSwitchingRound}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {!showNewRoundForm ? (
        <>
          <span className={`save-pill ${saveState}`}>Save: {saveState}</span>

          <nav className="page-tabs" aria-label="page tabs">
            <button
              className={page === 'track' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('track')}
            >
              Track
            </button>
            <button
              className={page === 'totals' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('totals')}
            >
              Round totals
            </button>
          </nav>

          {page === 'track' ? (
            <>
              <section className="card hole-picker" aria-label="hole picker">
                <h2>Select hole</h2>
                <div className="hole-grid">
                  {HOLES.map((hole) => (
                    <button
                      key={hole}
                      className={hole === selectedHole ? 'hole-btn active' : 'hole-btn'}
                      onClick={() => setSelectedHole(hole)}
                    >
                      {hole}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card" aria-label="hole stats">
                <h2>Hole {selectedHole}</h2>
                <p className="hint">
                  Round: {activeRound?.name || '...'} | Tap + to log. Tap - to correct. Use Fairway/GIR circles.
                </p>
                <div className="stat-section-list">
                  {COUNTER_SECTIONS.map((section) => (
                    <div key={section.title} className="stat-section">
                      <h3 className="section-title">{section.title}</h3>
                      <div className="stat-list">
                        {section.options.map((stat) => (
                          <div key={stat.key} className="stat-row">
                            <span>{stat.label}</span>
                            <div className="stat-actions">
                              <button onClick={() => updateStats(selectedHole, stat.key, -1)}>-</button>
                              <strong>{holeStats[stat.key]}</strong>
                              <button onClick={() => updateStats(selectedHole, stat.key, 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="stat-section">
                    <h3 className="section-title">{FAIRWAY_SECTION.title}</h3>
                    <div className="fairway-menu" role="group" aria-label="Fairway direction">
                      {FAIRWAY_SECTION.options.map((option) => (
                        <button
                          key={option.key}
                          className={
                            holeStats.fairwaySelection === option.key
                              ? `directional-btn ${option.position} active`
                              : `directional-btn ${option.position}`
                          }
                          onClick={() => setFairwaySelection(selectedHole, option.key)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="stat-section">
                    <h3 className="section-title">{GIR_SECTION.title}</h3>
                    <div className="gir-menu" role="group" aria-label="GIR direction">
                      {GIR_SECTION.options.map((option) => (
                        <button
                          key={option.key}
                          className={
                            holeStats.girSelection === option.key
                              ? `directional-btn ${option.position} active`
                              : `directional-btn ${option.position}`
                          }
                          onClick={() => setGirSelection(selectedHole, option.key)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="card" aria-label="round totals">
              <h2>Round totals: {activeRound?.name || '...'}</h2>
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
          )}

          <section className="card" aria-label="round notes">
            <h2>Notes</h2>
            <div className="notes-list">
              {roundNotes.length > 0 ? (
                roundNotes.map((note, index) => (
                  <div key={`${index}-${note.slice(0, 20)}`} className="note-item">
                    <p>{note}</p>
                    <button onClick={() => deleteNote(index)}>Delete</button>
                  </div>
                ))
              ) : (
                <p className="hint">No notes yet.</p>
              )}
            </div>
            <form className="note-form" onSubmit={addNote}>
              <textarea
                className="notes-input"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
              <button type="submit">Save note</button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}
