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
const API_COURSES_URL = `${API_BASE_URL}/api/courses`;
const API_CLUB_CARRY_URL = `${API_BASE_URL}/api/club-carry`;
const API_CLUB_ACTUALS_URL = `${API_BASE_URL}/api/club-actuals`;
const API_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;
const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const GOOGLE_MAPS_MAP_ID = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '').trim();
const DEFAULT_MAP_CENTER = { lat: -37.815, lng: 144.963 };
const AUTH_TOKEN_STORAGE_KEY = 'golf_stats_auth_token';
const sanitizeNoteText = (raw) =>
  String(raw || '')
    .trim()
    .slice(0, 1000);
const sanitizeNotesList = (raw) => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((note) => sanitizeNoteText(note))
    .filter(Boolean)
    .slice(0, 300);
};

const COUNTER_SECTIONS = [
  {
    title: 'Out of Position (OOP)',
    options: [
      { key: 'oopLook', label: 'Look' },
      { key: 'oopNoLook', label: 'No look' },
    ],
  },
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
    title: 'Putting',
    options: [
      { key: 'totalPutts', label: 'Total putts' },
      { key: 'puttMissLong', label: 'Miss long' },
      { key: 'puttMissShort', label: 'Miss short' },
      { key: 'puttMissWithin2m', label: 'Miss within 2m' },
    ],
  },
  {
    title: 'Penalties',
    options: [{ key: 'penalties', label: 'Penalties' }],
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

const getStatSectionOrder = (counterSections) => {
  const byTitle = new Map(counterSections.map((section) => [section.title, section]));
  const ordered = [];
  const addIfFound = (title) => {
    const section = byTitle.get(title);
    if (section) {
      ordered.push(section);
      byTitle.delete(title);
    }
  };

  addIfFound('Out of Position (OOP)');
  addIfFound('Inside 100 (Over 3 within 100m score)');
  addIfFound('Putting');
  addIfFound('Penalties');

  return [...ordered, ...Array.from(byTitle.values())];
};

const ORDERED_COUNTER_SECTIONS = getStatSectionOrder(COUNTER_SECTIONS);
const OOP_COUNTER_SECTION = ORDERED_COUNTER_SECTIONS.find((section) => section.title === 'Out of Position (OOP)');
const NON_OOP_COUNTER_SECTIONS = ORDERED_COUNTER_SECTIONS.filter(
  (section) => section.title !== 'Out of Position (OOP)',
);

const STAT_SECTIONS = [
  {
    title: FAIRWAY_SECTION.title,
    options: FAIRWAY_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
  ...(OOP_COUNTER_SECTION ? [OOP_COUNTER_SECTION] : []),
  {
    title: GIR_SECTION.title,
    options: GIR_SECTION.options.map(({ key, label }) => ({ key, label })),
  },
  ...NON_OOP_COUNTER_SECTIONS,
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
const distanceMetersBetween = (start, end) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMeters = 6371000;
  return earthRadiusMeters * c;
};
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

let googleMapsLoaderPromise;
const loadGoogleMapsScript = (apiKey) => {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps-loader]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&v=weekly&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
};

const emptyHoleStats = () =>
  COUNTER_OPTIONS.reduce(
    (acc, option) => {
      acc[option.key] = 0;
      return acc;
    },
    { score: 0, holeIndex: 1, fairwaySelection: null, girSelection: null, teePosition: null, greenPosition: null },
  );

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

const buildInitialCourseMarkers = () =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = { teePosition: null, greenPosition: null, holeIndex: hole };
    return acc;
  }, {});

const sanitizeLatLng = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
};

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
    safe[hole].holeIndex = Number.isFinite(holeIndex) ? Math.min(18, Math.max(1, Math.floor(holeIndex))) : hole;

    const fairwaySelection = raw[hole].fairwaySelection;
    safe[hole].fairwaySelection = VALID_FAIRWAY_KEYS.has(fairwaySelection) ? fairwaySelection : null;

    const girSelection = raw[hole].girSelection;
    safe[hole].girSelection = VALID_GIR_KEYS.has(girSelection) ? girSelection : null;

    safe[hole].teePosition = sanitizeLatLng(raw[hole].teePosition);
    safe[hole].greenPosition = sanitizeLatLng(raw[hole].greenPosition);
  });

  return safe;
};

const sanitizeCourseMarkers = (raw) => {
  const safe = buildInitialCourseMarkers();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const holeRaw = raw[hole];
    if (!holeRaw || typeof holeRaw !== 'object') {
      return;
    }

    safe[hole].teePosition = sanitizeLatLng(holeRaw.teePosition);
    safe[hole].greenPosition = sanitizeLatLng(holeRaw.greenPosition);
    const holeIndex = Number(holeRaw.holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex) ? Math.min(18, Math.max(1, Math.floor(holeIndex))) : hole;
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

const loadCoursesFromApi = async (token) => {
  const response = await requestApi(API_COURSES_URL, { token });
  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to load courses (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return Array.isArray(data?.courses) ? data.courses : [];
};

const createCourseInApi = async (name, token) => {
  const response = await requestApi(API_COURSES_URL, {
    method: 'POST',
    body: { name },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to create course (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.course;
};

const updateCourseInApi = async (courseId, name, markers, token) => {
  const response = await requestApi(`${API_COURSES_URL}/${encodeURIComponent(courseId)}`, {
    method: 'PUT',
    body: { name, markers },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to save course (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.course;
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

const saveRoundToApi = async (roundId, statsByHole, notes, courseId, token) => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'PUT',
    body: { statsByHole, notes, courseId },
    token,
  });

  if (!response.ok) {
    const details = await getErrorDetails(response);
    throw new ApiError(`Failed to save round (${response.status})`, response.status, details);
  }

  const data = await response.json();
  return data?.round;
};

const createRoundInApi = async (name, courseId, token) => {
  const response = await requestApi(API_ROUNDS_URL, {
    method: 'POST',
    body: { name, courseId },
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
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newRoundCourseId, setNewRoundCourseId] = useState('');
  const [courseEditorId, setCourseEditorId] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [courseSaveState, setCourseSaveState] = useState('saved');
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
  const [mapStatus, setMapStatus] = useState('idle');
  const [mapPlacementMode, setMapPlacementMode] = useState('idle');
  const [mapRotationSupport, setMapRotationSupport] = useState('unknown');
  const [teeToGreenMeters, setTeeToGreenMeters] = useState(null);
  const [mapSetupHole, setMapSetupHole] = useState(1);
  const [isMapSetupOpen, setIsMapSetupOpen] = useState(false);
  const [mapViewportVersion, setMapViewportVersion] = useState(0);
  const [mapDebugInfo, setMapDebugInfo] = useState(null);

  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const hasLoadedClubCarryRef = useRef(false);
  const skipNextClubCarrySaveRef = useRef(false);
  const hasLoadedClubAveragesRef = useRef(false);
  const selectedHoleRef = useRef(1);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapPlacementModeRef = useRef('idle');
  const teeMarkerRef = useRef(null);
  const greenMarkerRef = useRef(null);
  const distanceLineRef = useRef(null);
  const distanceLabelRef = useRef(null);
  const lastAutoHeadingRef = useRef(null);
  const mapInteractiveRef = useRef(false);

  const mapHole = page === 'courses' ? mapSetupHole : selectedHole;
  const holeStats = statsByHole[selectedHole];
  const activeRound = rounds.find((round) => round.id === selectedRoundId);
  const activeCourse = courses.find((course) => course.id === (activeRound?.courseId || selectedCourseId));
  const courseEditor = courses.find((course) => course.id === courseEditorId);
  const mapCourse = page === 'courses' ? courseEditor : activeCourse;
  const mapHoleStats = mapCourse?.markers?.[mapHole] ?? null;
  const displayHoleIndex = activeCourse?.markers?.[selectedHole]?.holeIndex ?? holeStats?.holeIndex ?? selectedHole;
  const teePosition = mapHoleStats?.teePosition ?? null;
  const greenPosition = mapHoleStats?.greenPosition ?? null;
  const mapStatusLabel =
    {
      idle: 'Idle',
      loading: 'Loading',
      locating: 'Locating',
      ready: 'Ready',
      error: 'Error',
      'missing-key': 'Missing key',
    }[mapStatus] || 'Idle';
  const mapPlacementLabel =
    {
      idle: 'Click to place',
      tee: 'Placing tee',
      green: 'Placing green',
    }[mapPlacementMode] || 'Click to place';
  const rotationSupportLabel =
    mapRotationSupport === 'supported'
      ? 'Rotation supported'
      : mapRotationSupport === 'unsupported'
        ? 'Rotation unsupported'
        : 'Rotation unknown';

  const handleAuthFailure = (message = 'Session expired. Log in again.') => {
    clearAuthToken();
    setAuthToken('');
    setAuthError(message);
    setRounds([]);
    setCourses([]);
    setSelectedCourseId('');
    setNewRoundCourseId('');
    setCourseEditorId('');
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
    setSelectedCourseId(round.courseId || '');
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
      setIsLoadingCourses(true);
      setCoursesError('');
      try {
        const [list, coursesList] = await Promise.all([loadRoundsFromApi(authToken), loadCoursesFromApi(authToken)]);
        if (!isActive) {
          return;
        }

        setRounds(list);
        const sanitizedCourses = coursesList.map((course) => ({
          id: String(course.id),
          name: String(course.name || ''),
          markers: sanitizeCourseMarkers(course.markers),
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        }));
        setCourses(sanitizedCourses);
        if (sanitizedCourses.length > 0 && !courseEditorId) {
          setCourseEditorId(sanitizedCourses[0].id);
        }
        if (list.length === 0) {
          hasLoadedRef.current = true;
          setSaveState('saved');
          setIsLoadingCourses(false);
          return;
        }

        const firstRound = await loadRoundFromApi(list[0].id, authToken);
        if (!isActive || !firstRound) {
          return;
        }

        applyRoundToState(firstRound);
        setIsLoadingCourses(false);
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
        setIsLoadingCourses(false);
        setCoursesError(error?.message || 'Failed to load courses');
      }
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  useEffect(() => {
    const shouldShowMap = page === 'courses' && isMapSetupOpen;
    if (!shouldShowMap) {
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setMapStatus('missing-key');
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    if (mapInstanceRef.current) {
      setMapStatus('ready');
      return;
    }

    let cancelled = false;
    setMapStatus('loading');

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: 16,
          mapTypeId: 'satellite',
          mapId: GOOGLE_MAPS_MAP_ID || undefined,
          tilt: 0,
          rotateControl: true,
          disableDefaultUI: true,
          clickableIcons: false,
        });
        lastAutoHeadingRef.current = null;
        const enforceTiltZero = () => {
          const map = mapInstanceRef.current;
          if (!map || typeof map.getTilt !== 'function') {
            return;
          }
          if (map.getTilt() !== 0) {
            map.setTilt(0);
          }
        };
        enforceTiltZero();
        mapInstanceRef.current.addListener('tilt_changed', enforceTiltZero);
        mapInstanceRef.current.addListener('zoom_changed', enforceTiltZero);
        if (typeof mapInstanceRef.current.getMapCapabilities === 'function') {
          const caps = mapInstanceRef.current.getMapCapabilities();
          if (caps && typeof caps.isHeadingSupported === 'boolean') {
            setMapRotationSupport(caps.isHeadingSupported ? 'supported' : 'unsupported');
          }
        }
        mapInstanceRef.current.addListener('click', (event) => {
          if (!mapInteractiveRef.current) {
            return;
          }
          if (!event?.latLng) {
            return;
          }
          const mode = mapPlacementModeRef.current;
          const next = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          const hole = selectedHoleRef.current;
          const courseId = courseEditorId;
          if (!courseId) {
            return;
          }
          if (mode === 'tee') {
            setCourses((prev) =>
              prev.map((course) =>
                course.id === courseId
                  ? {
                      ...course,
                      markers: {
                        ...course.markers,
                        [hole]: {
                          ...(course.markers?.[hole] || {}),
                          teePosition: next,
                        },
                      },
                    }
                  : course,
              ),
            );
            setCourseSaveState('unsaved');
            setMapPlacementMode('idle');
          } else if (mode === 'green') {
            setCourses((prev) =>
              prev.map((course) =>
                course.id === courseId
                  ? {
                      ...course,
                      markers: {
                        ...course.markers,
                        [hole]: {
                          ...(course.markers?.[hole] || {}),
                          greenPosition: next,
                        },
                      },
                    }
                  : course,
              ),
            );
            setCourseSaveState('unsaved');
            setMapPlacementMode('idle');
          }
        });

        setMapStatus('locating');
        if (!navigator.geolocation) {
          setMapStatus('error');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (cancelled || !mapInstanceRef.current) {
              return;
            }

            const current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            mapInstanceRef.current.setCenter(current);
            new google.maps.Marker({
              position: current,
              map: mapInstanceRef.current,
              title: 'Your location',
            });
            setMapStatus('ready');
          },
          () => {
            if (!cancelled) {
              setMapStatus('error');
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMapStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, isMapSetupOpen, courseEditorId]);

  useEffect(() => {
    const shouldShowMap = page === 'courses' && isMapSetupOpen;
    if (shouldShowMap) {
      return;
    }
    if (teeMarkerRef.current) {
      teeMarkerRef.current.setMap(null);
      teeMarkerRef.current = null;
    }
    if (greenMarkerRef.current) {
      greenMarkerRef.current.setMap(null);
      greenMarkerRef.current = null;
    }
    if (distanceLineRef.current) {
      distanceLineRef.current.setMap(null);
      distanceLineRef.current = null;
    }
    if (distanceLabelRef.current) {
      distanceLabelRef.current.setMap(null);
      distanceLabelRef.current = null;
    }
    mapInstanceRef.current = null;
    setMapStatus('idle');
  }, [page, isMapSetupOpen]);

  useEffect(() => {
    mapPlacementModeRef.current = mapPlacementMode;
  }, [mapPlacementMode]);

  useEffect(() => {
    selectedHoleRef.current = selectedHole;
  }, [selectedHole]);

  useEffect(() => {
    if (page === 'courses') {
      selectedHoleRef.current = mapSetupHole;
    }
  }, [page, mapSetupHole]);

  useEffect(() => {
    if (page === 'courses' && isMapSetupOpen) {
      setMapViewportVersion((prev) => prev + 1);
    }
  }, [page, isMapSetupOpen, mapSetupHole, courseEditorId]);

  useEffect(() => {
    lastAutoHeadingRef.current = null;
  }, [mapHole, isMapSetupOpen]);

  useEffect(() => {
    mapInteractiveRef.current = page === 'courses' && isMapSetupOpen;
  }, [page, isMapSetupOpen]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    if (teePosition) {
      if (!teeMarkerRef.current) {
        teeMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          title: 'Tee marker',
          label: { text: 'T', color: '#1b5e33', fontWeight: '700' },
        });
      } else if (teeMarkerRef.current.getMap() !== mapInstanceRef.current) {
        teeMarkerRef.current.setMap(mapInstanceRef.current);
      }
      teeMarkerRef.current.setPosition(teePosition);
    } else if (teeMarkerRef.current) {
      teeMarkerRef.current.setMap(null);
      teeMarkerRef.current = null;
    }

    if (greenPosition) {
      if (!greenMarkerRef.current) {
        greenMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          title: 'Green marker',
          label: { text: 'G', color: '#1b5e33', fontWeight: '700' },
        });
      } else if (greenMarkerRef.current.getMap() !== mapInstanceRef.current) {
        greenMarkerRef.current.setMap(mapInstanceRef.current);
      }
      greenMarkerRef.current.setPosition(greenPosition);
    } else if (greenMarkerRef.current) {
      greenMarkerRef.current.setMap(null);
      greenMarkerRef.current = null;
    }

    if (teePosition && greenPosition) {
      const map = mapInstanceRef.current;
      if (map) {
        map.setHeading(0);
        map.setTilt(0);
      }
      const toRadians = (deg) => (deg * Math.PI) / 180;
      const toDegrees = (rad) => (rad * 180) / Math.PI;
      const lat1 = toRadians(teePosition.lat);
      const lat2 = toRadians(greenPosition.lat);
      const dLng = toRadians(greenPosition.lng - teePosition.lng);
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

      const distanceMeters = distanceMetersBetween(teePosition, greenPosition);
      const basePadding = distanceMeters < 120 ? 60 : distanceMeters < 200 ? 80 : distanceMeters < 300 ? 90 : 120;
      const deltaLat = Math.abs(teePosition.lat - greenPosition.lat);
      const deltaLng = Math.abs(teePosition.lng - greenPosition.lng);
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(teePosition);
      bounds.extend(greenPosition);
      const fitPadding = {
        top: basePadding,
        bottom: basePadding + 20,
        left: basePadding,
        right: basePadding,
      };
      const ensureFitBounds = (attempt = 0, padding = fitPadding, postHeading = null, source = 'base') => {
        const map = mapInstanceRef.current;
        if (!map) {
          return;
        }
        if (typeof postHeading === 'number') {
          map.setHeading(postHeading);
          map.setTilt(0);
        }
        map.fitBounds(bounds, padding);
        window.setTimeout(() => {
          if (typeof postHeading === 'number') {
            map.setHeading(postHeading);
            map.setTilt(0);
          }
          const nextMap = mapInstanceRef.current;
          const mapBounds = nextMap?.getBounds();
          if (mapBounds) {
            const ne = mapBounds.getNorthEast();
            const sw = mapBounds.getSouthWest();
            setMapDebugInfo({
              hole: mapHole,
              tee: teePosition,
              green: greenPosition,
              bounds: {
                ne: { lat: ne.lat(), lng: ne.lng() },
                sw: { lat: sw.lat(), lng: sw.lng() },
              },
              attempt,
              padding,
              source,
            });
          }
          if (mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition)) {
            return;
          }
          if (attempt < 2) {
            ensureFitBounds(attempt + 1, padding, postHeading, source);
          }
        }, 200);
      };
      const zoomOutUntilVisible = (attempt = 0) => {
        const nextMap = mapInstanceRef.current;
        if (!nextMap) {
          return;
        }
        const mapBounds = nextMap.getBounds();
        if (mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition)) {
          return;
        }
        if (attempt >= 3) {
          return;
        }
        const currentZoom = nextMap.getZoom();
        if (typeof currentZoom === 'number') {
          nextMap.setZoom(currentZoom - 1);
        }
        window.setTimeout(() => zoomOutUntilVisible(attempt + 1), 120);
      };

      // ensureFitBounds(0, fitPadding, bearing, 'base');

      if (lastAutoHeadingRef.current !== bearing) {
        lastAutoHeadingRef.current = bearing;
        const applyHeading = () => {
          const map = mapInstanceRef.current;
          if (!map || typeof map.setHeading !== 'function') {
            return;
          }
          if (mapRotationSupport === 'unsupported') {
            return;
          }
          map.setOptions({ heading: bearing, tilt: 0 });
          map.setHeading(bearing);
          map.setTilt(0);
        };
        window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
          ensureFitBounds(0, fitPadding, bearing, 'base');
          const extraPadding = {
            top: fitPadding.top + 40,
            bottom: fitPadding.bottom + 40,
            left: fitPadding.left + 40,
            right: fitPadding.right + 40,
          };
          window.setTimeout(() => {
            const map = mapInstanceRef.current;
            const mapBounds = map?.getBounds();
            if (map && !(mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition))) {
              ensureFitBounds(0, extraPadding, bearing, 'extra');
              window.setTimeout(() => zoomOutUntilVisible(0), 160);
            }
            const projection = map?.getProjection?.();
            const zoom = map?.getZoom?.();
            if (map && projection && typeof zoom === 'number') {
              const scale = Math.pow(2, zoom);
              const center = map.getCenter();
              if (center) {
                const greenPoint = projection.fromLatLngToPoint(new window.google.maps.LatLng(greenPosition));
                const centerPoint = projection.fromLatLngToPoint(center);
                const desiredScreenOffsetPx = 80;
                const currentOffsetPx = (greenPoint.y - centerPoint.y) * scale;
                if (currentOffsetPx < -desiredScreenOffsetPx) {
                  const deltaPx = -desiredScreenOffsetPx - currentOffsetPx;
                  const nextCenterPoint = new window.google.maps.Point(centerPoint.x, centerPoint.y + deltaPx / scale);
                  const nextCenter = projection.fromPointToLatLng(nextCenterPoint);
                  map.setCenter(nextCenter);
                }
              }
            }
          }, 150);
        });
      }

      const geometry = window.google.maps.geometry;
      if (geometry?.spherical?.computeDistanceBetween) {
        const teeLatLng = new window.google.maps.LatLng(teePosition);
        const greenLatLng = new window.google.maps.LatLng(greenPosition);
        const meters = Math.round(geometry.spherical.computeDistanceBetween(teeLatLng, greenLatLng));
        setTeeToGreenMeters(Number.isFinite(meters) ? meters : null);

        if (!distanceLineRef.current) {
          distanceLineRef.current = new window.google.maps.Polyline({
            map: mapInstanceRef.current,
            strokeColor: '#1b5e33',
            strokeOpacity: 0.9,
            strokeWeight: 3,
          });
        } else if (distanceLineRef.current.getMap() !== mapInstanceRef.current) {
          distanceLineRef.current.setMap(mapInstanceRef.current);
        }
        distanceLineRef.current.setPath([teeLatLng, greenLatLng]);

        const midpoint = {
          lat: (teePosition.lat + greenPosition.lat) / 2,
          lng: (teePosition.lng + greenPosition.lng) / 2,
        };
        if (!distanceLabelRef.current) {
          distanceLabelRef.current = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 0,
              strokeOpacity: 0,
              fillOpacity: 0,
            },
            label: {
              text: `${meters} m`,
              color: '#1d3557',
              fontWeight: '700',
              fontSize: '13px',
            },
          });
        } else if (distanceLabelRef.current.getMap() !== mapInstanceRef.current) {
          distanceLabelRef.current.setMap(mapInstanceRef.current);
        }
        distanceLabelRef.current.setPosition(midpoint);
        distanceLabelRef.current.setLabel({
          text: `${meters} m`,
          color: '#1d3557',
          fontWeight: '700',
          fontSize: '13px',
        });
      } else {
        setTeeToGreenMeters(null);
        if (distanceLineRef.current) {
          distanceLineRef.current.setMap(null);
          distanceLineRef.current = null;
        }
        if (distanceLabelRef.current) {
          distanceLabelRef.current.setMap(null);
          distanceLabelRef.current = null;
        }
      }
    } else {
      setTeeToGreenMeters(null);
      setMapDebugInfo(null);
      if (distanceLineRef.current) {
        distanceLineRef.current.setMap(null);
        distanceLineRef.current = null;
      }
      if (distanceLabelRef.current) {
        distanceLabelRef.current.setMap(null);
        distanceLabelRef.current = null;
      }
    }
  }, [teePosition, greenPosition, mapStatus, mapHole, mapViewportVersion]);

  useEffect(() => {
    if (!authToken || !hasLoadedRef.current || !selectedRoundId) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setSaveState((prev) => (prev === 'saving' ? prev : 'unsaved'));
  }, [authToken, selectedRoundId, statsByHole, roundNotes, selectedCourseId]);

  const saveCurrentRound = async () => {
    if (!authToken || !selectedRoundId) {
      return;
    }

    setSaveState('saving');
    try {
      const savedRound = await saveRoundToApi(selectedRoundId, statsByHole, roundNotes, selectedCourseId, authToken);
      setSaveState('saved');
      setRounds((prev) =>
        prev.map((round) =>
          round.id === selectedRoundId
            ? {
                ...round,
                name: savedRound?.name ?? round.name,
                courseId: savedRound?.courseId ?? round.courseId,
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
    const roundTitle = newRoundTitle.trim();
    const roundDate = newRoundDate || new Date().toISOString().slice(0, 10);
    const roundName = roundTitle ? `${roundTitle} - ${roundDate}` : `Round ${roundDate}`;

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      const round = await createRoundInApi(roundName, newRoundCourseId, authToken);
      if (round) {
        const summary = {
          id: round.id,
          name: round.name,
          courseId: round.courseId || '',
          createdAt: round.createdAt,
          updatedAt: round.updatedAt,
        };
        setRounds((prev) => [summary, ...prev]);
        setNewRoundTitle('');
        setNewRoundCourseId('');
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

  const createCourse = async (event) => {
    event?.preventDefault();
    if (!authToken) {
      return;
    }
    const courseName = newCourseName.trim();
    if (!courseName) {
      return;
    }

    setIsLoadingCourses(true);
    setCoursesError('');
    try {
      const course = await createCourseInApi(courseName, authToken);
      if (course) {
        const sanitizedCourse = {
          id: String(course.id),
          name: String(course.name || ''),
          markers: sanitizeCourseMarkers(course.markers),
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        };
        setCourses((prev) => [sanitizedCourse, ...prev]);
        setCourseEditorId(sanitizedCourse.id);
        setSelectedCourseId(sanitizedCourse.id);
        setNewCourseName('');
        setCourseSaveState('saved');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setCoursesError(error?.message || 'Failed to create course');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const saveCurrentCourse = async () => {
    if (!authToken || !courseEditorId) {
      return;
    }

    const course = courses.find((entry) => entry.id === courseEditorId);
    if (!course) {
      return;
    }

    setCourseSaveState('saving');
    try {
      const savedCourse = await updateCourseInApi(course.id, course.name, course.markers, authToken);
      if (savedCourse) {
        setCourses((prev) =>
          prev.map((entry) =>
            entry.id === course.id
              ? {
                  ...entry,
                  name: savedCourse.name || entry.name,
                  markers: sanitizeCourseMarkers(savedCourse.markers),
                  updatedAt: savedCourse.updatedAt || entry.updatedAt,
                }
              : entry,
          ),
        );
      }
      setCourseSaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setCourseSaveState('error');
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

  const courseHoleIndexCounts = useMemo(() => {
    if (!courseEditor?.markers) {
      return {};
    }

    return HOLES.reduce((acc, hole) => {
      const indexValue = Number(courseEditor.markers?.[hole]?.holeIndex);
      if (!Number.isFinite(indexValue)) {
        return acc;
      }

      acc[indexValue] = (acc[indexValue] || 0) + 1;
      return acc;
    }, {});
  }, [courseEditor]);

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
            <button
              onClick={() => {
                setNewRoundCourseId(selectedCourseId);
                setShowNewRoundForm(true);
              }}
              disabled={isSwitchingRound}
            >
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
              value={newRoundTitle}
              onChange={(event) => setNewRoundTitle(event.target.value)}
              placeholder="Round name"
              maxLength={80}
            />
            <select
              value={newRoundCourseId}
              onChange={(event) => setNewRoundCourseId(event.target.value)}
              disabled={isSwitchingRound || isLoadingCourses}
            >
              <option value="">No course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <input type="date" value={newRoundDate} onChange={(event) => setNewRoundDate(event.target.value)} />
          </div>
          <div className="new-round-actions">
            <button type="submit" disabled={isSwitchingRound}>
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setNewRoundCourseId('');
                setShowNewRoundForm(false);
              }}
              disabled={isSwitchingRound}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {!showNewRoundForm ? (
        <>
          <span className={`save-pill ${saveState}`}>Save: {saveState}</span>

          <nav className="page-tabs" aria-label="page tabs">
            <button className={page === 'track' ? 'tab-btn active' : 'tab-btn'} onClick={() => setPage('track')}>
              Track
            </button>
            <button className={page === 'distance' ? 'tab-btn active' : 'tab-btn'} onClick={() => setPage('distance')}>
              Distances
            </button>
            <button
              className={page === 'clubAverages' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('clubAverages')}
            >
              Club averages
            </button>
            <button className={page === 'totals' ? 'tab-btn active' : 'tab-btn'} onClick={() => setPage('totals')}>
              Round totals
            </button>
            <button className={page === 'courses' ? 'tab-btn active' : 'tab-btn'} onClick={() => setPage('courses')}>
              Courses
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
                <div className="hole-header">
                  <h2>Hole {selectedHole}</h2>
                  <span className="hole-index">Index {displayHoleIndex}</span>
                </div>
                <p className="hint">
                  Round: {activeRound?.name || '...'} | Tap + to log. Tap - to correct. Use Fairway/GIR circles.
                </p>
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
                  </div>
                </div>
                <div className="stat-section-list">
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

                  {OOP_COUNTER_SECTION ? (
                    <div className="stat-section">
                      <h3 className="section-title">{OOP_COUNTER_SECTION.title}</h3>
                      <div className="stat-list">
                        {OOP_COUNTER_SECTION.options.map((stat) => (
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
                  ) : null}

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

                  {NON_OOP_COUNTER_SECTIONS.filter((section) =>
                    section.title === 'Inside 100 (Over 3 within 100m score)'
                      ? ['girLeft', 'girRight', 'girLong', 'girShort'].includes(holeStats.girSelection)
                      : true,
                  ).map((section) => (
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
                </div>
                <div className="manual-save-row">
                  <button
                    className="save-btn"
                    onClick={saveCurrentRound}
                    disabled={!selectedRoundId || saveState === 'saving' || saveState === 'loading'}
                  >
                    {saveState === 'saving' ? 'Saving...' : 'Save hole'}
                  </button>
                </div>
              </section>
            </>
          ) : page === 'courses' ? (
            <section className="card" aria-label="course management">
              <h2>Courses</h2>
              <p className="hint">Manage course markers and reuse them for new rounds.</p>
              <div className="course-management-grid">
                <section className="card" aria-label="course list">
                  <h3 className="section-title">Course list</h3>
                  <div className="course-form">
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(event) => setNewCourseName(event.target.value)}
                      placeholder="New course name"
                      maxLength={80}
                    />
                    <button type="button" onClick={createCourse} disabled={!newCourseName.trim() || isLoadingCourses}>
                      Create course
                    </button>
                  </div>
                  {coursesError ? <p className="hint">{coursesError}</p> : null}
                  <div className="course-list">
                    {courses.length === 0 ? (
                      <p className="hint">No courses yet.</p>
                    ) : (
                      courses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          className={courseEditorId === course.id ? 'course-btn active' : 'course-btn'}
                          onClick={() => {
                            setCourseEditorId(course.id);
                            setIsMapSetupOpen(false);
                            setMapPlacementMode('idle');
                            setMapSetupHole(1);
                            setCourseSaveState('saved');
                          }}
                        >
                          {course.name}
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="card" aria-label="course editor">
                  <div className="map-header">
                    <h3 className="section-title">Course details</h3>
                    <span className={`save-pill ${courseSaveState}`}>Save: {courseSaveState}</span>
                  </div>
                  {!courseEditor ? (
                    <p className="hint">Select a course to edit markers.</p>
                  ) : (
                    <>
                      <label className="course-name-field">
                        Course name
                        <input
                          type="text"
                          value={courseEditor.name}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            setCourses((prev) =>
                              prev.map((entry) =>
                                entry.id === courseEditor.id ? { ...entry, name: nextName } : entry,
                              ),
                            );
                            setCourseSaveState('unsaved');
                          }}
                        />
                      </label>
                      <div className="manual-save-row">
                        <button type="button" onClick={saveCurrentCourse} disabled={courseSaveState === 'saving'}>
                          {courseSaveState === 'saving' ? 'Saving...' : 'Save course'}
                        </button>
                      </div>
                      <div className="course-setup-list">
                        {HOLES.map((hole) => {
                          const holeMarkers = courseEditor.markers?.[hole];
                          const indexValue = holeMarkers?.holeIndex ?? hole;
                          const isDuplicate = (courseHoleIndexCounts[indexValue] || 0) > 1;
                          return (
                            <div key={hole} className="course-setup-row">
                              <strong>Hole {hole}</strong>
                              <label className="course-index-field">
                                Index
                                <select
                                  value={indexValue}
                                  onChange={(event) => {
                                    const nextValue = Math.min(18, Math.max(1, Math.floor(Number(event.target.value))));
                                    setCourses((prev) =>
                                      prev.map((entry) =>
                                        entry.id === courseEditor.id
                                          ? {
                                              ...entry,
                                              markers: {
                                                ...entry.markers,
                                                [hole]: {
                                                  ...(entry.markers?.[hole] || {}),
                                                  holeIndex: nextValue,
                                                },
                                              },
                                            }
                                          : entry,
                                      ),
                                    );
                                    setCourseSaveState('unsaved');
                                  }}
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
                              <span className="course-marker-status">
                                {holeMarkers?.teePosition ? 'Tee ✓' : 'Tee —'}
                              </span>
                              <span className="course-marker-status">
                                {holeMarkers?.greenPosition ? 'Green ✓' : 'Green —'}
                              </span>
                              <button
                                type="button"
                                className={isMapSetupOpen && mapSetupHole === hole ? 'active' : ''}
                                onClick={() => {
                                  setMapSetupHole(hole);
                                  setIsMapSetupOpen(true);
                                }}
                              >
                                {isMapSetupOpen && mapSetupHole === hole ? 'Map open' : 'Open map'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>
              </div>

              {courseEditor && isMapSetupOpen ? (
                <section className="card map-card" aria-label="course setup map">
                  <div className="map-header">
                    <h2>
                      {courseEditor.name} - Hole {mapSetupHole}
                    </h2>
                    <div className="map-header-meta">
                      <span className={`map-status ${mapStatus}`}>{mapStatusLabel}</span>
                      <span className="map-status neutral">{rotationSupportLabel}</span>
                    </div>
                  </div>
                  <p className="hint">
                    Place tee and green markers for this hole. The map auto-rotates and stores coordinates.
                  </p>
                  {!GOOGLE_MAPS_MAP_ID ? (
                    <p className="map-warning">Rotation needs a Google Maps Map ID (VITE_GOOGLE_MAPS_MAP_ID).</p>
                  ) : null}
                  {!GOOGLE_MAPS_API_KEY ? (
                    <p className="map-warning">Set VITE_GOOGLE_MAPS_API_KEY to render the map.</p>
                  ) : null}
                  <div className="map-controls">
                    <button
                      type="button"
                      className={mapPlacementMode === 'tee' ? 'active' : ''}
                      onClick={() => setMapPlacementMode(mapPlacementMode === 'tee' ? 'idle' : 'tee')}
                      disabled={!GOOGLE_MAPS_API_KEY}
                    >
                      Place tee
                    </button>
                    <button
                      type="button"
                      className={mapPlacementMode === 'green' ? 'active' : ''}
                      onClick={() => setMapPlacementMode(mapPlacementMode === 'green' ? 'idle' : 'green')}
                      disabled={!GOOGLE_MAPS_API_KEY}
                    >
                      Place green
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const hole = selectedHoleRef.current;
                        setCourses((prev) =>
                          prev.map((entry) =>
                            entry.id === courseEditor.id
                              ? {
                                  ...entry,
                                  markers: {
                                    ...entry.markers,
                                    [hole]: {
                                      ...(entry.markers?.[hole] || {}),
                                      teePosition: null,
                                      greenPosition: null,
                                    },
                                  },
                                }
                              : entry,
                          ),
                        );
                        setCourseSaveState('unsaved');
                        setTeeToGreenMeters(null);
                      }}
                      disabled={!GOOGLE_MAPS_API_KEY}
                    >
                      Clear markers
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapSetupOpen(false);
                        setMapPlacementMode('idle');
                      }}
                    >
                      Close map
                    </button>
                    <span className="map-placement-status">{mapPlacementLabel}</span>
                    {teeToGreenMeters != null ? <span className="map-distance">{teeToGreenMeters} m</span> : null}
                    {mapDebugInfo ? (
                      <span className="map-debug">
                        Debug: hole {mapDebugInfo.hole} | tee {mapDebugInfo.tee?.lat?.toFixed?.(5)},
                        {mapDebugInfo.tee?.lng?.toFixed?.(5)} | green {mapDebugInfo.green?.lat?.toFixed?.(5)},
                        {mapDebugInfo.green?.lng?.toFixed?.(5)} | bounds NE {mapDebugInfo.bounds.ne.lat.toFixed(5)},
                        {mapDebugInfo.bounds.ne.lng.toFixed(5)} SW {mapDebugInfo.bounds.sw.lat.toFixed(5)},
                        {mapDebugInfo.bounds.sw.lng.toFixed(5)} | attempt {mapDebugInfo.attempt} | source{' '}
                        {mapDebugInfo.source} | padding {mapDebugInfo.padding?.top}/{mapDebugInfo.padding?.left}
                      </span>
                    ) : null}
                  </div>
                  <div className="map-shell">
                    <div ref={mapContainerRef} className="map-canvas" role="presentation" aria-hidden="true" />
                    {mapStatus === 'loading' ? <div className="map-overlay">Loading map...</div> : null}
                    {mapStatus === 'locating' ? <div className="map-overlay">Locating you...</div> : null}
                    {mapStatus === 'error' ? (
                      <div className="map-overlay error">Map failed to load or location denied.</div>
                    ) : null}
                  </div>
                </section>
              ) : null}
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

              <div className="manual-save-row">
                <button className="save-btn" onClick={addShotPrototypeNote}>
                  Save distance
                </button>
              </div>
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
