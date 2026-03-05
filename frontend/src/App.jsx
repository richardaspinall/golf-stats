import React, { useEffect, useMemo, useRef, useState } from 'react';

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);
const HOLE_INDEX_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);
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
const API_CLUB_CARRY_URL = `${API_BASE_URL}/api/club-carry`;
const API_CLUB_ACTUALS_URL = `${API_BASE_URL}/api/club-actuals`;
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
  { key: 'squareStance', label: 'Square' },
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
const CLUB_OPTIONS = CLUB_GROUPS.flatMap((group) => group.options);
const CLUB_OPTION_SET = new Set(CLUB_OPTIONS);
const LIE_OPTIONS = ['Tee', 'Fairway', 'First cut', 'Rough', 'Bunker', 'Recovery'];

const emptyHoleStats = () =>
  COUNTER_OPTIONS.reduce((acc, option) => {
    acc[option.key] = 0;
    return acc;
  }, { score: 0, holeIndex: 1, fairwaySelection: null, girSelection: null });

const emptyTotals = () =>
  TOTAL_OPTIONS.reduce((acc, option) => {
    acc[option.key] = 0;
    return acc;
  }, {});

const buildInitialByHole = () =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = {
      ...emptyHoleStats(),
      holeIndex: hole,
    };
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

    const score = Number(raw[hole].score);
    safe[hole].score = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;

    const holeIndex = Number(raw[hole].holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex)
      ? Math.min(18, Math.max(1, Math.floor(holeIndex)))
      : hole;

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

const sanitizeCarryMeters = (rawValue) => {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    return '';
  }

  return Math.min(400, Math.round(value));
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

const deleteRoundInApi = async (roundId, token) => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to delete round (${response.status})`, response.status, details);
  }
};

const loadClubCarryFromApi = async (token) => {
  const response = await requestApi(API_CLUB_CARRY_URL, { token });
  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to load club carry (${response.status})`, response.status, details);
  }

  const data = await response.json();
  const raw = data?.carryByClub;
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return CLUB_OPTIONS.reduce((acc, club) => {
    const sanitized = sanitizeCarryMeters(raw[club]);
    if (sanitized !== '') {
      acc[club] = sanitized;
    }
    return acc;
  }, {});
};

const saveClubCarryToApi = async (carryByClub, token) => {
  const response = await requestApi(API_CLUB_CARRY_URL, {
    method: 'PUT',
    body: { carryByClub },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to save club carry (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.carryByClub || {};
};

const saveClubActualToApi = async ({ club, actualMeters }, token) => {
  const response = await requestApi(API_CLUB_ACTUALS_URL, {
    method: 'POST',
    body: { club, actualMeters },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to save shot actual (${response.status})`, response.status, details);
  }
};

const loadClubActualAveragesFromApi = async (token) => {
  const response = await requestApi(API_CLUB_ACTUALS_URL, { token });
  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to load club averages (${response.status})`, response.status, details);
  }

  const data = await response.json();
  const averagesByClubRaw = data?.averagesByClub;
  if (!averagesByClubRaw || typeof averagesByClubRaw !== 'object') {
    return CLUB_OPTIONS.map((club) => ({ club, avgMeters: null, shots: 0 }));
  }

  return CLUB_OPTIONS.map((club) => {
    const row = averagesByClubRaw[club];
    const avgMeters = Number(row?.avgMeters);
    const shots = Number(row?.shots);
    if (!Number.isFinite(avgMeters) || avgMeters <= 0 || !Number.isFinite(shots) || shots <= 0) {
      return { club, avgMeters: null, shots: 0 };
    }

    return {
      club,
      avgMeters: Math.round(avgMeters),
      shots: Math.floor(shots),
    };
  });
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
  const [targetDistanceMeters, setTargetDistanceMeters] = useState(0);
  const [actualDistancePaces, setActualDistancePaces] = useState(() => metersToPaces(120));
  const [offlineMeters, setOfflineMeters] = useState(0);
  const [setupSelection, setSetupSelection] = useState('');
  const [swingClock, setSwingClock] = useState('');
  const [clubSelection, setClubSelection] = useState('');
  const [lieSelection, setLieSelection] = useState('');
  const [clubAverages, setClubAverages] = useState([]);
  const [isLoadingClubAverages, setIsLoadingClubAverages] = useState(false);
  const [clubAveragesError, setClubAveragesError] = useState('');
  const [clubAveragesDirty, setClubAveragesDirty] = useState(true);
  const [shotLogSaveState, setShotLogSaveState] = useState('idle');
  const [clubCarryByClub, setClubCarryByClub] = useState({});
  const [clubCarrySaveState, setClubCarrySaveState] = useState('saved');

  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const hasLoadedClubCarryRef = useRef(false);
  const skipNextClubCarrySaveRef = useRef(false);
  const hasLoadedClubAveragesRef = useRef(false);

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
    setClubAverages([]);
    setClubAveragesError('');
    setClubAveragesDirty(true);
    setShotLogSaveState('idle');
    setShowNewRoundForm(false);
    setSaveState('loading');
    setClubCarryByClub({});
    setClubCarrySaveState('saved');
    hasLoadedRef.current = false;
    skipNextSaveRef.current = false;
    hasLoadedClubCarryRef.current = false;
    skipNextClubCarrySaveRef.current = false;
    hasLoadedClubAveragesRef.current = false;
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

    setSaveState((prev) => (prev === 'saving' ? prev : 'unsaved'));
  }, [authToken, selectedRoundId, statsByHole, roundNotes]);

  const saveCurrentRound = async () => {
    if (!authToken || !selectedRoundId) {
      return;
    }

    setSaveState('saving');
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
  };

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

  const deleteRound = async () => {
    if (!authToken || !selectedRoundId || isSwitchingRound) {
      return;
    }

    const roundName = activeRound?.name || 'this round';
    const firstPrompt = window.confirm(`Delete "${roundName}"? This cannot be undone.`);
    if (!firstPrompt) {
      return;
    }

    const secondPrompt = window.confirm(`Final confirmation: permanently delete "${roundName}"?`);
    if (!secondPrompt) {
      return;
    }

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      await deleteRoundInApi(selectedRoundId, authToken);

      const updatedRounds = rounds.filter((round) => round.id !== selectedRoundId);
      setRounds(updatedRounds);

      if (updatedRounds.length === 0) {
        skipNextSaveRef.current = true;
        hasLoadedRef.current = true;
        setSelectedRoundId('');
        setStatsByHole(buildInitialByHole());
        setRoundNotes([]);
        setNoteDraft('');
        setSaveState('saved');
        return;
      }

      const nextRound = await loadRoundFromApi(updatedRounds[0].id, authToken);
      if (nextRound) {
        applyRoundToState(nextRound);
      } else {
        setSaveState('error');
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
        acc.score += statsByHole[hole].score;
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
      { ...emptyTotals(), score: 0 },
    );
  }, [statsByHole]);

  const holeIndexCounts = useMemo(() => {
    return HOLES.reduce((acc, hole) => {
      const indexValue = statsByHole[hole]?.holeIndex;
      if (!Number.isFinite(indexValue)) {
        return acc;
      }

      acc[indexValue] = (acc[indexValue] || 0) + 1;
      return acc;
    }, {});
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

  const updateHoleScore = (hole, delta) => {
    setStatsByHole((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        score: Math.max(0, prev[hole].score + delta),
      },
    }));
  };

  const setHoleIndexValue = (hole, value) => {
    const nextValue = Math.min(18, Math.max(1, Math.floor(Number(value) || 1)));
    setStatsByHole((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        holeIndex: nextValue,
      },
    }));
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

  const addShotPrototypeNote = async () => {
    const actualDistanceMeters = pacesToMeters(actualDistancePaces);
    const selectedSetup = SHOT_SETUP_OPTIONS.find((option) => option.key === setupSelection);
    const setupText = selectedSetup ? selectedSetup.label : 'No setup notes';
    const clubText = clubSelection || 'No club selected';
    const lieText = lieSelection || 'No lie selected';
    const targetText = targetDistanceMeters > 0 ? `Target ${targetDistanceMeters}m` : null;
    const offlineText =
      offlineMeters === 0 ? null : `Offline ${Math.abs(offlineMeters)}m ${offlineMeters < 0 ? 'left' : 'right'}`;
    const swingText = swingClock ? `Swing ${swingClock}` : 'No swing clock';
    const summaryParts = [
      targetText,
      `Actual ${actualDistanceMeters}m`,
      offlineText,
      clubText,
      `Lie ${lieText}`,
      setupText,
      swingText,
    ].filter(Boolean);
    const summary = sanitizeNoteText(summaryParts.join(' | '));
    if (!summary) {
      return;
    }

    setRoundNotes((prev) => [...prev, summary]);

    if (!authToken || !CLUB_OPTION_SET.has(clubSelection) || actualDistanceMeters <= 0) {
      return;
    }

    setShotLogSaveState('saving');
    try {
      await saveClubActualToApi({ club: clubSelection, actualMeters: actualDistanceMeters }, authToken);
      setClubAveragesDirty(true);
      setShotLogSaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

      setShotLogSaveState('error');
    }
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
      setClubAveragesDirty(true);
      setClubCarrySaveState('saved');
      hasLoadedRef.current = false;
      skipNextSaveRef.current = false;
      hasLoadedClubCarryRef.current = false;
      skipNextClubCarrySaveRef.current = false;
      hasLoadedClubAveragesRef.current = false;
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

  useEffect(() => {
    let isActive = true;

    const loadClubCarry = async () => {
      if (!authToken) {
        return;
      }

      setClubCarrySaveState('loading');
      try {
        const loaded = await loadClubCarryFromApi(authToken);
        if (!isActive) {
          return;
        }

        skipNextClubCarrySaveRef.current = true;
        hasLoadedClubCarryRef.current = true;
        setClubCarryByClub(loaded);
        setClubCarrySaveState('saved');
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        hasLoadedClubCarryRef.current = true;
        setClubCarryByClub({});
        setClubCarrySaveState('error');
      }
    };

    loadClubCarry();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !hasLoadedClubCarryRef.current) {
      return;
    }

    if (skipNextClubCarrySaveRef.current) {
      skipNextClubCarrySaveRef.current = false;
      return;
    }

    setClubCarrySaveState((prev) => (prev === 'saving' ? prev : 'unsaved'));
  }, [authToken, clubCarryByClub]);

  const saveClubCarry = async () => {
    if (!authToken) {
      return;
    }

    setClubCarrySaveState('saving');
    try {
      const saved = await saveClubCarryToApi(clubCarryByClub, authToken);
      skipNextClubCarrySaveRef.current = true;
      setClubCarryByClub((prev) => {
        const prevSerialized = JSON.stringify(prev);
        const savedSerialized = JSON.stringify(saved);
        return prevSerialized === savedSerialized ? prev : saved;
      });
      setClubCarrySaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

      setClubCarrySaveState('error');
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadClubAverages = async () => {
      if (!authToken || page !== 'clubAverages') {
        return;
      }

      if (!clubAveragesDirty && hasLoadedClubAveragesRef.current) {
        return;
      }

      setIsLoadingClubAverages(true);
      setClubAveragesError('');
      try {
        const averages = await loadClubActualAveragesFromApi(authToken);
        if (!isActive) {
          return;
        }

        setClubAverages(averages);
        setClubAveragesDirty(false);
        hasLoadedClubAveragesRef.current = true;
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setClubAverages([]);
        setClubAveragesError('Unable to load club averages right now.');
      } finally {
        if (isActive) {
          setIsLoadingClubAverages(false);
        }
      }
    };

    loadClubAverages();

    return () => {
      isActive = false;
    };
  }, [authToken, page, clubAveragesDirty]);

  const setCarryForClub = (club, rawValue) => {
    const sanitized = sanitizeCarryMeters(rawValue);
    setClubCarryByClub((prev) => {
      const next = { ...prev };
      if (sanitized === '') {
        delete next[club];
      } else {
        next[club] = sanitized;
      }
      return next;
    });
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
            <button className="reset-btn" onClick={deleteRound} disabled={!selectedRoundId || isSwitchingRound}>
              Delete round
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
              Distances
            </button>
            <button
              className={page === 'clubAverages' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('clubAverages')}
            >
              Club averages
            </button>
            <button
              className={page === 'courseSetup' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('courseSetup')}
            >
              Course setup
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
                <div className="manual-save-row">
                  <button
                    onClick={saveCurrentRound}
                    disabled={!selectedRoundId || saveState === 'saving' || saveState === 'loading'}
                  >
                    {saveState === 'saving' ? 'Saving...' : 'Save hole'}
                  </button>
                </div>
                <div className="stat-section">
                  <h3 className="section-title">Hole details</h3>
                  <div className="stat-list">
                    <div className="stat-row">
                      <span>Score</span>
                      <div className="stat-actions">
                        <button onClick={() => updateHoleScore(selectedHole, -1)}>-</button>
                        <strong>{holeStats.score}</strong>
                        <button onClick={() => updateHoleScore(selectedHole, 1)}>+</button>
                      </div>
                    </div>
                    <div className="stat-row">
                      <span>Hole index</span>
                      <div className="stat-actions">
                        <strong>{holeStats.holeIndex}</strong>
                      </div>
                    </div>
                  </div>
                </div>
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
          ) : page === 'courseSetup' ? (
            <section className="card" aria-label="course setup">
              <h2>Course setup</h2>
              <p className="hint">Set hole indexes once for this round. Duplicate values are flagged.</p>
              <div className="manual-save-row">
                <button
                  onClick={saveCurrentRound}
                  disabled={!selectedRoundId || saveState === 'saving' || saveState === 'loading'}
                >
                  {saveState === 'saving' ? 'Saving...' : 'Save course setup'}
                </button>
              </div>
              <div className="course-setup-list">
                {HOLES.map((hole) => {
                  const indexValue = statsByHole[hole]?.holeIndex ?? hole;
                  const isDuplicate = (holeIndexCounts[indexValue] || 0) > 1;
                  return (
                    <div key={hole} className="course-setup-row">
                      <strong>Hole {hole}</strong>
                      <label className="course-index-field">
                        Index
                        <select
                          value={indexValue}
                          onChange={(event) => setHoleIndexValue(hole, Number(event.target.value))}
                        >
                          {HOLE_INDEX_OPTIONS.map((indexOption) => (
                            <option key={indexOption} value={indexOption}>
                              {indexOption}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className={isDuplicate ? 'course-index-warning' : 'course-index-ok'}>
                        {isDuplicate ? 'Duplicate index' : 'OK'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : page === 'totals' ? (
            <section className="card" aria-label="round totals">
              <h2>Round totals: {activeRound?.name || '...'}</h2>
              <p className="hint">Total score: {totals.score}</p>
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
          ) : page === 'distance' ? (
            <section className="card" aria-label="distance setup prototype">
              <h2>Distances</h2>
              <p className="hint">Use this tab to capture distance, setup choices, and swing clock feel.</p>

              <div className="prototype-block">
                <div className="distance-header">
                  <span>Target distance</span>
                  <strong>{targetDistanceMeters === 0 ? 'Off' : `${targetDistanceMeters}m`}</strong>
                </div>
                <input
                  type="range"
                  min={0}
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
                      ? 'Off'
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
                            onClick={() => setClubSelection((prev) => (prev === club ? '' : club))}
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
                      onClick={() => setLieSelection((prev) => (prev === lie ? '' : lie))}
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
                      onClick={() => setSwingClock((prev) => (prev === clock ? '' : clock))}
                    >
                      {clock}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={addShotPrototypeNote}>Add to round notes</button>
              {shotLogSaveState !== 'idle' ? <p className="hint">Shot log save: {shotLogSaveState}</p> : null}
            </section>
          ) : (
            <section className="card" aria-label="club distance averages">
              <h2>Club distance averages</h2>
              <p className="hint">Averages are based on your independent shot log and are not deleted with rounds.</p>
              <p className="hint">Carry save: {clubCarrySaveState}</p>
              <div className="manual-save-row">
                <button
                  onClick={saveClubCarry}
                  disabled={clubCarrySaveState === 'saving' || clubCarrySaveState === 'loading'}
                >
                  {clubCarrySaveState === 'saving' ? 'Saving...' : 'Save carry'}
                </button>
              </div>
              {isLoadingClubAverages ? <p className="hint">Loading averages...</p> : null}
              {!isLoadingClubAverages && clubAveragesError ? <p className="hint">{clubAveragesError}</p> : null}
              {!isLoadingClubAverages && !clubAveragesError ? (
                clubAverages.length > 0 ? (
                  <div className="average-list">
                    {clubAverages.map((entry) => (
                      <div key={entry.club} className="average-row">
                        <span className="average-club">{entry.club}</span>
                        <strong className="average-metrics">
                          {entry.avgMeters !== null ? `${entry.avgMeters}m (${entry.shots} shots)` : 'No data yet'}
                        </strong>
                        <label className="carry-field">
                          Carry
                          <input
                            type="number"
                            min={0}
                            max={400}
                            step={1}
                            value={clubCarryByClub[entry.club] ?? ''}
                            onChange={(event) => setCarryForClub(entry.club, event.target.value)}
                            placeholder="m"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="hint">No saved shot-note data found yet.</p>
                )
              ) : null}
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
