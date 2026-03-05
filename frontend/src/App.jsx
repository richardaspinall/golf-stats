import React, { useEffect, useMemo, useRef, useState } from 'react';

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);
const normalizeApiBaseUrl = (rawValue) => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) {
    return 'http://localhost:3001';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/\/$/, '')}`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const API_ROUNDS_URL = `${API_BASE_URL}/api/rounds`;
const API_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;
const AUTH_TOKEN_STORAGE_KEY = 'golf_stats_auth_token';
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
const SHOT_SETUP_OPTIONS = [
  { key: 'openStance', label: 'Open stance' },
  { key: 'closedStance', label: 'Closed stance' },
];
const SWING_CLOCK_OPTIONS = ['7:30', '9:00', '10:30', 'Full'];
const METERS_PER_PACE = 0.83;
const metersToPaces = (meters) => Math.round(meters / METERS_PER_PACE);
const pacesToMeters = (paces) => Math.round(paces * METERS_PER_PACE);
const CLUB_GROUPS = [
  { label: 'Wedges', options: ['60', '56', '50', 'PW'] },
  { label: 'Irons + Hybrid', options: ['9i', '8i', '7i', '6i', '5i', '4i', '5Hy'] },
  { label: 'Woods', options: ['5 wood', '3 wood'] },
  { label: 'Drivers', options: ['Mini Driver', 'Driver'] },
  { label: 'Putter', options: ['Putter'] },
];
const LIE_OPTIONS = ['Tee', 'Fairway', 'First cut', 'Rough', 'Bunker', 'Recovery'];

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

const loadStoredAuthToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
};

const saveAuthToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

const clearAuthToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

class ApiError extends Error {
  constructor(message, status, details = '') {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const getErrorDetails = async (response) => {
  try {
    const data = await response.json();
    return data?.error || '';
  } catch {
    return '';
  }
};

const requestApi = async (url, { method = 'GET', body, token } = {}) => {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
};

const loginToApi = async (username, password) => {
  const response = await requestApi(API_LOGIN_URL, {
    method: 'POST',
    body: { username, password },
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Login failed (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return String(data?.token || '');
};

const loadRoundsFromApi = async (token) => {
  const response = await requestApi(API_ROUNDS_URL, { token });
  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to load rounds (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return Array.isArray(data?.rounds) ? data.rounds : [];
};

const loadRoundFromApi = async (roundId, token) => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, { token });
  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to load round (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.round;
};

const saveRoundToApi = async (roundId, statsByHole, notes, token) => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'PUT',
    body: { statsByHole, notes },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to save round (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.round;
};

const createRoundInApi = async (name, token) => {
  const response = await requestApi(API_ROUNDS_URL, {
    method: 'POST',
    body: { name },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to create round (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.round;
};

export default function App() {
  const [authToken, setAuthToken] = useState(() => loadStoredAuthToken());
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
  const [targetDistanceMeters, setTargetDistanceMeters] = useState(120);
  const [actualDistancePaces, setActualDistancePaces] = useState(() => metersToPaces(120));
  const [offlineMeters, setOfflineMeters] = useState(0);
  const [setupSelection, setSetupSelection] = useState('');
  const [swingClock, setSwingClock] = useState('9:00');
  const [clubSelection, setClubSelection] = useState('');
  const [lieSelection, setLieSelection] = useState('');

  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  const holeStats = statsByHole[selectedHole];
  const activeRound = rounds.find((round) => round.id === selectedRoundId);

  const handleAuthFailure = (message = 'Session expired. Log in again.') => {
    clearAuthToken();
    setAuthToken('');
    setAuthError(message);
    setRounds([]);
    setSelectedRoundId('');
    setStatsByHole(buildInitialByHole());
    setRoundNotes([]);
    setNoteDraft('');
    setShowNewRoundForm(false);
    setSaveState('loading');
    hasLoadedRef.current = false;
    skipNextSaveRef.current = false;
  };

  const logout = () => {
    handleAuthFailure('');
    setLoginPassword('');
  };

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
      if (!authToken) {
        return;
      }

      setSaveState('loading');
      try {
        const list = await loadRoundsFromApi(authToken);
        if (!isActive) {
          return;
        }

        setRounds(list);
        if (list.length === 0) {
          hasLoadedRef.current = true;
          setSaveState('saved');
          return;
        }

        const firstRound = await loadRoundFromApi(list[0].id, authToken);
        if (!isActive || !firstRound) {
          return;
        }

        applyRoundToState(firstRound);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
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
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !hasLoadedRef.current || !selectedRoundId) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setSaveState('saving');
    const timeoutId = setTimeout(async () => {
      try {
        const savedRound = await saveRoundToApi(selectedRoundId, statsByHole, roundNotes, authToken);
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
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setSaveState('error');
      }
    }, 180);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [authToken, selectedRoundId, statsByHole, roundNotes]);

  const switchRound = async (roundId) => {
    if (!roundId || roundId === selectedRoundId) {
      return;
    }

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      const round = await loadRoundFromApi(roundId, authToken);
      if (round) {
        applyRoundToState(round);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

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
      const round = await createRoundInApi(roundName, authToken);
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
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

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

  const toggleSetupSelection = (setupKey) => {
    setSetupSelection((prev) => (prev === setupKey ? '' : setupKey));
  };

  const addShotPrototypeNote = () => {
    const actualDistanceMeters = pacesToMeters(actualDistancePaces);
    const selectedSetup = SHOT_SETUP_OPTIONS.find((option) => option.key === setupSelection);
    const setupText = selectedSetup ? selectedSetup.label : 'No setup notes';
    const clubText = clubSelection || 'No club selected';
    const lieText = lieSelection || 'No lie selected';
    const offlineText =
      offlineMeters === 0
        ? 'On line'
        : `Offline ${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`;
    const summary = sanitizeNoteText(
      `Target ${targetDistanceMeters}m | Actual ${actualDistanceMeters}m | ${offlineText} | ${clubText} | Lie ${lieText} | ${setupText} | Swing ${swingClock}`,
    );
    if (!summary) {
      return;
    }

    setRoundNotes((prev) => [...prev, summary]);
  };

  const login = async (event) => {
    event?.preventDefault();
    const username = loginUsername.trim();
    const password = loginPassword;
    if (!username || !password) {
      setAuthError('Enter username and password.');
      return;
    }

    setIsLoggingIn(true);
    setAuthError('');
    try {
      const token = await loginToApi(username, password);
      if (!token) {
        setAuthError('No token was returned.');
        return;
      }

      saveAuthToken(token);
      setAuthToken(token);
      setLoginPassword('');
      setSaveState('loading');
      hasLoadedRef.current = false;
      skipNextSaveRef.current = false;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthError(error.details || 'Invalid credentials.');
      } else {
        setAuthError('Unable to log in right now.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!authToken) {
    return (
      <main className="app">
        <section className="card">
          <h1>Golf Stat Tracker</h1>
          <h2>Sign in</h2>
          <form className="new-round-form" onSubmit={login}>
            <div className="new-round-fields">
              <input
                type="text"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                placeholder="Username"
                autoComplete="username"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>
            <div className="new-round-actions">
              <button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            {authError ? <p className="hint">{authError}</p> : null}
          </form>
        </section>
      </main>
    );
  }

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
            <button onClick={logout} disabled={isSwitchingRound}>
              Log out
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
            <button
              className={page === 'distance' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('distance')}
            >
              Distance setup
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
          ) : page === 'totals' ? (
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
          ) : (
            <section className="card" aria-label="distance setup prototype">
              <h2>Distance setup prototype</h2>
              <p className="hint">Use this tab to capture distance, setup choices, and swing clock feel.</p>

              <div className="prototype-block">
                <div className="distance-header">
                  <span>Target distance</span>
                  <strong>{targetDistanceMeters}m</strong>
                </div>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={1}
                  value={targetDistanceMeters}
                  onChange={(event) => setTargetDistanceMeters(Number(event.target.value))}
                />
              </div>

              <div className="prototype-block">
                <div className="distance-header">
                  <span>Actual distance</span>
                  <strong>{actualDistancePaces} paces</strong>
                </div>
                <input
                  type="range"
                  min={metersToPaces(10)}
                  max={metersToPaces(300)}
                  step={1}
                  value={actualDistancePaces}
                  onChange={(event) => setActualDistancePaces(Number(event.target.value))}
                />
              </div>

              <div className="prototype-block">
                <div className="distance-header">
                  <span>Offline</span>
                  <strong>
                    {offlineMeters === 0
                      ? 'On line'
                      : `${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={offlineMeters}
                  onChange={(event) => setOfflineMeters(Number(event.target.value))}
                />
              </div>

              <div className="prototype-block">
                <h3 className="section-title">Club</h3>
                <div className="club-groups" role="group" aria-label="Club selection">
                  {CLUB_GROUPS.map((group) => (
                    <div key={group.label} className="club-group">
                      <h4 className="club-group-title">{group.label}</h4>
                      <div className="club-row">
                        {group.options.map((club) => (
                          <button
                            key={club}
                            className={clubSelection === club ? 'club-btn active' : 'club-btn'}
                            onClick={() => setClubSelection(club)}
                          >
                            {club}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prototype-block">
                <h3 className="section-title">Lie</h3>
                <div className="club-row" role="group" aria-label="Lie selection">
                  {LIE_OPTIONS.map((lie) => (
                    <button
                      key={lie}
                      className={lieSelection === lie ? 'club-btn active' : 'club-btn'}
                      onClick={() => setLieSelection(lie)}
                    >
                      {lie}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prototype-block">
                <h3 className="section-title">Setup notes</h3>
                <div className="quick-notes-row" role="group" aria-label="Setup note buttons">
                  {SHOT_SETUP_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      className={setupSelection === option.key ? 'quick-note-btn active' : 'quick-note-btn'}
                      onClick={() => toggleSetupSelection(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prototype-block">
                <h3 className="section-title">Clock system</h3>
                <div className="clock-row" role="group" aria-label="Swing clock">
                  {SWING_CLOCK_OPTIONS.map((clock) => (
                    <button
                      key={clock}
                      className={swingClock === clock ? 'clock-btn active' : 'clock-btn'}
                      onClick={() => setSwingClock(clock)}
                    >
                      {clock}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={addShotPrototypeNote}>Add to round notes</button>
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
