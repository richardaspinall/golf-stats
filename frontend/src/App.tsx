import { useEffect, useMemo, useRef, useState } from 'react';

import { PageTabs } from './components/PageTabs';
import { SavePill } from './components/SavePill';
import { NotesSection } from './components/NotesSection';
import { DistancePage } from './components/pages/DistancePage';
import { CoursesPage } from './components/pages/CoursesPage';
import { RoundsPage } from './components/pages/RoundsPage';
import { TotalsPage } from './components/pages/TotalsPage';
import { TrackPage } from './components/pages/TrackPage';
import { VirtualCaddyPage } from './components/pages/VirtualCaddyPage';
import { WedgeMatrixPage } from './components/pages/WedgeMatrixPage';
import { useCourseManagement } from './hooks/useCourseManagement';
import { useCourseMap } from './hooks/useCourseMap';
import { useRoundNotes } from './hooks/useRoundNotes';
import { useWedgeMatrix } from './hooks/useWedgeMatrix';
import {
  ApiError,
  createRoundInApi,
  deleteClubActualEntryInApi,
  deleteRoundInApi,
  loadClubActualAveragesFromApi,
  loadClubActualEntriesFromApi,
  loadClubCarryFromApi,
  loadCurrentUserFromApi,
  loadCoursesFromApi,
  loadRoundFromApi,
  loadRoundsFromApi,
  loadWedgeEntriesFromApi,
  loadWedgeMatricesFromApi,
  linkGoogleAccountInApi,
  loginToApi,
  loginWithGoogleInApi,
  saveClubActualToApi,
  saveClubCarryToApi,
  saveRoundToApi,
  syncVirtualCaddyClubActualsInApi,
} from './lib/api';
import type { UserProfile } from './types';
import {
  CLUB_OPTIONS,
  CLUB_OPTION_SET,
  COUNTER_OPTIONS,
  HOLES,
  HOLE_INDEX_OPTIONS,
  SWING_CLOCK_OPTIONS,
} from './lib/constants';
import { GOOGLE_CLIENT_ID, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from './lib/config';
import { distanceMetersBetween, metersToPaces, pacesToMeters } from './lib/geometry';
import { isGoogleAuthEnabled, loadGoogleIdentityScript } from './lib/googleAuth';
import {
  buildInitialByHole,
  computeTotalsForStats,
  sanitizeCourseMarkers,
  sanitizeCarryMeters,
  sanitizeNotesList,
  sanitizeRoundHandicap,
  sanitizeStats,
} from './lib/rounds';
import { clearAuthToken, clearStoredRoundDraft, loadStoredAuthToken, loadStoredRoundDraft, saveAuthToken, saveStoredRoundDraft } from './lib/storage';
import { buildShotSummary, getDisplayHoleIndex, toggleHoleSelection, updateHoleCounter, updateHoleScoreValue } from './lib/track';
import { buildWedgeMatrixRows, sortClubsByDefaultOrder } from './lib/wedgeMatrix';

function VirtualCaddyTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l7 4v8l-7 4-7-4V8l7-4z" />
      <path d="M12 10a2 2 0 100 4 2 2 0 000-4z" />
      <path d="M12 2v2" />
      <path d="M4.6 6l1.7 1" />
      <path d="M19.4 6l-1.7 1" />
    </svg>
  );
}

function DistanceTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18L18 4" />
      <path d="M14 4h4v4" />
      <path d="M6 20h14" />
      <path d="M6 16v4" />
      <path d="M10 18v2" />
      <path d="M14 18v2" />
      <path d="M18 16v4" />
    </svg>
  );
}

function WedgeMatrixTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9.5 5v14" />
      <path d="M14.5 5v14" />
      <path d="M4 10h16" />
      <path d="M4 14h16" />
    </svg>
  );
}

function TotalsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 19V9" />
      <path d="M12 19V5" />
      <path d="M18 19v-7" />
      <path d="M4 19h16" />
    </svg>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(() => loadStoredAuthToken());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleLinkError, setGoogleLinkError] = useState('');
  const [googleLinkSuccess, setGoogleLinkSuccess] = useState('');
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const [selectedHole, setSelectedHole] = useState(1);
  const [page, setPage] = useState('virtualCaddy');
  const [rounds, setRounds] = useState([]);
  const [roundSummaries, setRoundSummaries] = useState({});
  const [roundSummariesState, setRoundSummariesState] = useState('idle');
  const [roundSummariesError, setRoundSummariesError] = useState('');
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const [showDistanceTracker, setShowDistanceTracker] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newRoundCourseId, setNewRoundCourseId] = useState('');
  const [courseEditorId, setCourseEditorId] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundHandicap, setNewRoundHandicap] = useState('');
  const [courseSaveState, setCourseSaveState] = useState('saved');
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newRoundDate, setNewRoundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showNewRoundForm, setShowNewRoundForm] = useState(false);
  const [statsByHole, setStatsByHole] = useState(() => buildInitialByHole());
  const [roundHandicap, setRoundHandicap] = useState(0);
  const [roundNotes, setRoundNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [saveState, setSaveState] = useState('loading');
  const [isSwitchingRound, setIsSwitchingRound] = useState(false);
  const [targetDistanceMeters, setTargetDistanceMeters] = useState(0);
  const [actualDistanceMeters, setActualDistanceMeters] = useState(120);
  const [actualDistancePaces, setActualDistancePaces] = useState(() => metersToPaces(120));
  const [actualDistanceUnit, setActualDistanceUnit] = useState('paces');
  const [offlineMeters, setOfflineMeters] = useState<number | null>(null);
  const [distanceMode, setDistanceMode] = useState('view');
  const [setupSelection, setSetupSelection] = useState('');
  const [swingClock, setSwingClock] = useState('');
  const [clubSelection, setClubSelection] = useState('');
  const [lieSelection, setLieSelection] = useState('');
  const [clubAverages, setClubAverages] = useState([]);
  const [isLoadingClubAverages, setIsLoadingClubAverages] = useState(false);
  const [clubAveragesError, setClubAveragesError] = useState('');
  const [clubAveragesDirty, setClubAveragesDirty] = useState(true);
  const [clubActualEntries, setClubActualEntries] = useState([]);
  const [isLoadingClubActualEntries, setIsLoadingClubActualEntries] = useState(false);
  const [clubActualEntriesError, setClubActualEntriesError] = useState('');
  const [clubActualEntriesDirty, setClubActualEntriesDirty] = useState(true);
  const [shotLogSaveState, setShotLogSaveState] = useState('idle');
  const [clubCarryByClub, setClubCarryByClub] = useState({});
  const [clubCarrySaveState, setClubCarrySaveState] = useState('saved');
  const [isWedgeFormOpen, setIsWedgeFormOpen] = useState(false);
  const [activeWedgeMatrixId, setActiveWedgeMatrixId] = useState(null);
  const [showWedgeMatrixBackToVirtualCaddy, setShowWedgeMatrixBackToVirtualCaddy] = useState(false);
  const [wedgeMatrixMode, setWedgeMatrixMode] = useState('view');
  const [isWedgeMatrixFormOpen, setIsWedgeMatrixFormOpen] = useState(false);
  const [editingWedgeMatrixId, setEditingWedgeMatrixId] = useState(null);
  const [wedgeMatrixName, setWedgeMatrixName] = useState('');
  const [wedgeMatrixStanceWidth, setWedgeMatrixStanceWidth] = useState('');
  const [wedgeMatrixGrip, setWedgeMatrixGrip] = useState('');
  const [wedgeMatrixBallPosition, setWedgeMatrixBallPosition] = useState('');
  const [wedgeMatrixNotes, setWedgeMatrixNotes] = useState('');
  const [wedgeMatrixClubs, setWedgeMatrixClubs] = useState([]);
  const [wedgeMatrixSwingClocks, setWedgeMatrixSwingClocks] = useState(() => [...SWING_CLOCK_OPTIONS]);
  const [wedgeMatrixEnabledColumns, setWedgeMatrixEnabledColumns] = useState([true, true, true, true]);
  const [wedgeMatrixSaveState, setWedgeMatrixSaveState] = useState('idle');
  const [wedgeMatricesError, setWedgeMatricesError] = useState('');
  const [isLoadingWedgeMatrices, setIsLoadingWedgeMatrices] = useState(false);
  const [wedgeMatrices, setWedgeMatrices] = useState([]);
  const [wedgeClubSelection, setWedgeClubSelection] = useState('');
  const [wedgeSwingClock, setWedgeSwingClock] = useState('');
  const [wedgeDistanceMeters, setWedgeDistanceMeters] = useState(60);
  const [wedgeDistancePaces, setWedgeDistancePaces] = useState(() => metersToPaces(60));
  const [wedgeDistanceUnit, setWedgeDistanceUnit] = useState('meters');
  const [wedgeEntryError, setWedgeEntryError] = useState('');
  const [wedgeEntrySaveState, setWedgeEntrySaveState] = useState('idle');
  const [wedgeEntriesError, setWedgeEntriesError] = useState('');
  const [isLoadingWedgeEntries, setIsLoadingWedgeEntries] = useState(false);
  const [wedgeEntriesByMatrix, setWedgeEntriesByMatrix] = useState({});
  const [editingWedgeEntryId, setEditingWedgeEntryId] = useState(null);
  const [recentEntriesMatrixId, setRecentEntriesMatrixId] = useState(null);
  const [mapSetupHole, setMapSetupHole] = useState(1);
  const [isMapSetupOpen, setIsMapSetupOpen] = useState(false);
  const [isTrackMapOpen, setIsTrackMapOpen] = useState(false);
  const [isVirtualCaddyFocusMode, setIsVirtualCaddyFocusMode] = useState(false);

  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const hasLoadedClubCarryRef = useRef(false);
  const skipNextClubCarrySaveRef = useRef(false);
  const hasLoadedClubAveragesRef = useRef(false);
  const statsByHoleRef = useRef(statsByHole);

  useEffect(() => {
    statsByHoleRef.current = statsByHole;
  }, [statsByHole]);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleLinkButtonRef = useRef<HTMLDivElement | null>(null);

  const holeStats = statsByHole[selectedHole];
  const activeRound = rounds.find((round) => round.id === selectedRoundId);
  const activeCourse = courses.find((course) => course.id === (activeRound?.courseId || selectedCourseId));
  const courseEditor = courses.find((course) => course.id === courseEditorId);
  const displayHoleIndex = getDisplayHoleIndex(activeCourse, holeStats, selectedHole);
  const displayHolePar = activeCourse?.markers?.[selectedHole]?.par ?? null;
  const selectedHoleMarker = activeCourse?.markers?.[selectedHole];
  const manualHoleDistanceMeters = selectedHoleMarker?.distanceMeters ?? null;
  const derivedTeeToGreenMeters =
    selectedHoleMarker?.teePosition && selectedHoleMarker?.greenPosition
      ? Math.round(distanceMetersBetween(selectedHoleMarker.teePosition, selectedHoleMarker.greenPosition))
      : null;
  const isMapOpen = page === 'courses' ? isMapSetupOpen : page === 'track' ? isTrackMapOpen : false;
  const activeMapHole = page === 'courses' ? mapSetupHole : selectedHole;
  const activeMapCourse = page === 'courses' ? courseEditor : activeCourse;
  const activeMapCourseId = page === 'courses' ? courseEditorId : activeCourse?.id || '';
  const {
    mapContainerRef,
    selectedHoleRef,
    mapStatus,
    mapPlacementMode,
    setMapPlacementMode,
    teeToGreenMeters,
    setTeeToGreenMeters,
    mapDebugInfo,
    mapStatusLabel,
    mapPlacementLabel,
    rotationSupportLabel,
    resetMapState,
  } = useCourseMap({
    isMapOpen,
    selectedHole: activeMapHole,
    activeCourseId: activeMapCourseId,
    activeCourse: activeMapCourse,
    isInteractive: page === 'courses' && isMapSetupOpen,
    setCourses,
    setCourseSaveState,
  });
  const effectiveTeeToGreenMeters = manualHoleDistanceMeters ?? teeToGreenMeters ?? derivedTeeToGreenMeters;
  const handleAuthFailure = (message = 'Session expired. Log in again.') => {
    clearAuthToken();
    setAuthToken('');
    setCurrentUser(null);
    setAuthError(message);
    setGoogleAuthError('');
    setGoogleLinkError('');
    setGoogleLinkSuccess('');
    setRounds([]);
    setRoundSummaries({});
    setRoundSummariesState('idle');
    setRoundSummariesError('');
    setIsManageMenuOpen(false);
    setShowDistanceTracker(false);
    setCourses([]);
    setSelectedCourseId('');
    setNewRoundCourseId('');
    setNewRoundHandicap('');
    setCourseEditorId('');
    setSelectedRoundId('');
    setStatsByHole(buildInitialByHole());
    setRoundHandicap(0);
    setRoundNotes([]);
    setNoteDraft('');
    setClubAverages([]);
    setClubAveragesError('');
    setClubAveragesDirty(true);
    setClubActualEntries([]);
    setClubActualEntriesError('');
    setClubActualEntriesDirty(true);
    setShotLogSaveState('idle');
    setShowNewRoundForm(false);
    setSaveState('loading');
    setClubCarryByClub({});
    setClubCarrySaveState('saved');
    setDistanceMode('setup');
    setIsWedgeFormOpen(false);
    setActiveWedgeMatrixId(null);
    setWedgeMatrixMode('setup');
    setIsWedgeMatrixFormOpen(false);
    setEditingWedgeMatrixId(null);
    setWedgeMatrixName('');
    setWedgeMatrixStanceWidth('');
    setWedgeMatrixGrip('');
    setWedgeMatrixBallPosition('');
    setWedgeMatrixNotes('');
    setWedgeMatrixClubs([]);
    setWedgeMatrixSwingClocks([...SWING_CLOCK_OPTIONS]);
    setWedgeMatrixEnabledColumns([true, true, true, true]);
    setWedgeMatrixSaveState('idle');
    setWedgeMatricesError('');
    setIsLoadingWedgeMatrices(false);
    setWedgeMatrices([]);
    setWedgeClubSelection('');
    setWedgeSwingClock('');
    setWedgeDistanceMeters(60);
    setWedgeEntryError('');
    setWedgeEntrySaveState('idle');
    setWedgeEntriesError('');
    setIsLoadingWedgeEntries(false);
    setWedgeEntriesByMatrix({});
    setEditingWedgeEntryId(null);
    setRecentEntriesMatrixId(null);
    setIsTrackMapOpen(false);
    resetMapState();
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

  const applyAuthenticatedSession = (token, user) => {
    saveAuthToken(token);
    setAuthToken(token);
    setCurrentUser(user || null);
    setLoginPassword('');
    setGoogleLinkError('');
    setGoogleLinkSuccess('');
    setSaveState('loading');
    setClubAveragesDirty(true);
    setClubCarrySaveState('saved');
    hasLoadedRef.current = false;
    skipNextSaveRef.current = false;
    hasLoadedClubCarryRef.current = false;
    skipNextClubCarrySaveRef.current = false;
    hasLoadedClubAveragesRef.current = false;
  };

  const applyRoundToState = (round) => {
    const storedDraft = loadStoredRoundDraft(round.id);
    const hasStoredDraft = Boolean(storedDraft);

    skipNextSaveRef.current = true;
    hasLoadedRef.current = true;
    setSelectedRoundId(round.id);
    setStatsByHole(sanitizeStats(hasStoredDraft ? storedDraft?.statsByHole : round.statsByHole));
    setRoundHandicap(sanitizeRoundHandicap(hasStoredDraft ? storedDraft?.roundHandicap : round.handicap) || 0);
    setRoundNotes(sanitizeNotesList(hasStoredDraft ? storedDraft?.roundNotes : round.notes));
    setSelectedCourseId(
      typeof (hasStoredDraft ? storedDraft?.selectedCourseId : round.courseId) === 'string'
        ? ((hasStoredDraft ? storedDraft?.selectedCourseId : round.courseId) as string)
        : '',
    );
    setNoteDraft('');
    setSaveState(hasStoredDraft ? 'unsaved' : 'saved');
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
    let isActive = true;

    const loadRoundSummaries = async () => {
      if (!authToken || page !== 'rounds') {
        return;
      }

      const missing = rounds.filter((round) => !roundSummaries[round.id]);
      if (missing.length === 0) {
        return;
      }

      setRoundSummariesState('loading');
      setRoundSummariesError('');
      try {
        const entries = await Promise.all(
          missing.map(async (round) => {
            const full = await loadRoundFromApi(round.id, authToken);
            if (!full) {
              return null;
            }
            const roundCourse = courses.find((course) => course.id === (full.courseId || ''));
            const totals = computeTotalsForStats(full.statsByHole, roundCourse?.markers, full.handicap || 0);
            return [round.id, { totals }];
          }),
        );
        if (!isActive) {
          return;
        }
        setRoundSummaries((prev) => {
          const next = { ...prev };
          entries.filter(Boolean).forEach(([id, data]) => {
            next[id] = data;
          });
          return next;
        });
        setRoundSummariesState('loaded');
      } catch (error) {
        if (!isActive) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }
        setRoundSummariesState('error');
        setRoundSummariesError('Unable to load round summaries.');
      }
    };

    loadRoundSummaries();

    return () => {
      isActive = false;
    };
  }, [authToken, courses, page, rounds, roundSummaries]);

  useEffect(() => {
    if (!authToken || !hasLoadedRef.current || !selectedRoundId) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setSaveState((prev) => (prev === 'saving' ? prev : 'unsaved'));
  }, [authToken, selectedRoundId, statsByHole, roundHandicap, roundNotes, selectedCourseId]);

  useEffect(() => {
    if (!authToken || !hasLoadedRef.current || !selectedRoundId) {
      return;
    }

    if (saveState === 'unsaved') {
      saveStoredRoundDraft(selectedRoundId, {
        statsByHole,
        roundHandicap,
        roundNotes,
        selectedCourseId,
      });
      return;
    }

    if (saveState === 'saved') {
      clearStoredRoundDraft(selectedRoundId);
    }
  }, [authToken, selectedRoundId, saveState, selectedCourseId, roundHandicap, roundNotes, statsByHole]);

  const persistRoundStats = async (nextStatsByHole = statsByHole) => {
    if (!authToken || !selectedRoundId) {
      return false;
    }

    setSaveState('saving');
    try {
      const savedRound = await saveRoundToApi(selectedRoundId, nextStatsByHole, roundNotes, roundHandicap, selectedCourseId, authToken);
      const savedCourse = courses.find((course) => course.id === (savedRound?.courseId || selectedCourseId));
      setSaveState('saved');
      clearStoredRoundDraft(selectedRoundId);
      setRounds((prev) =>
        prev.map((round) =>
          round.id === selectedRoundId
            ? {
                ...round,
                name: savedRound?.name ?? round.name,
                handicap: savedRound?.handicap ?? round.handicap,
                courseId: savedRound?.courseId ?? round.courseId,
                updatedAt: savedRound?.updatedAt ?? round.updatedAt,
              }
            : round,
        ),
      );
      setRoundSummaries((prev) => ({
        ...prev,
        [selectedRoundId]: {
          totals: computeTotalsForStats(savedRound?.statsByHole ?? nextStatsByHole, savedCourse?.markers, savedRound?.handicap ?? roundHandicap),
        },
      }));
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return false;
      }

      setSaveState('error');
      return false;
    }
  };

  const saveCurrentRound = async () => {
    return persistRoundStats(statsByHole);
  };

  const saveAndNextHole = async () => {
    const didSave = await saveCurrentRound();
    if (!didSave) {
      return;
    }
    const nextHole = selectedHole >= HOLES.length ? HOLES[0] : selectedHole + 1;
    setSelectedHole(nextHole);
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
    const handicap = sanitizeRoundHandicap(newRoundHandicap);
    const roundTitle = newRoundTitle.trim();
    const roundDate = newRoundDate || new Date().toISOString().slice(0, 10);
    const roundName = roundTitle || 'Round';

    setIsSwitchingRound(true);
    setSaveState('loading');
    try {
      const round = await createRoundInApi(roundName, roundDate, handicap === '' ? 0 : handicap, newRoundCourseId, authToken);
      if (round) {
        const roundCourse = courses.find((course) => course.id === (round.courseId || ''));
        const summary = {
          id: round.id,
          name: round.name,
          roundDate: round.roundDate,
          handicap: round.handicap || 0,
          courseId: round.courseId || '',
          createdAt: round.createdAt,
          updatedAt: round.updatedAt,
        };
        setRounds((prev) => [summary, ...prev]);
        setRoundSummaries((prev) => ({
          ...prev,
          [round.id]: {
            totals: computeTotalsForStats(round.statsByHole, roundCourse?.markers, round.handicap || 0),
          },
        }));
        setNewRoundTitle('');
        setNewRoundHandicap('');
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
      clearStoredRoundDraft(selectedRoundId);
      setRounds(updatedRounds);
      setRoundSummaries((prev) => {
        const next = { ...prev };
        delete next[selectedRoundId];
        return next;
      });

      if (updatedRounds.length === 0) {
        skipNextSaveRef.current = true;
        hasLoadedRef.current = true;
        setSelectedRoundId('');
        setStatsByHole(buildInitialByHole());
        setRoundHandicap(0);
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
    return computeTotalsForStats(statsByHole, activeCourse?.markers, roundHandicap);
  }, [activeCourse?.markers, roundHandicap, statsByHole]);

  const updateStats = (hole, statKey, delta) => {
    setStatsByHole((prev) => updateHoleCounter(prev, hole, statKey, delta));
  };

  const setGirSelection = (hole, girKey) => {
    setStatsByHole((prev) => toggleHoleSelection(prev, hole, 'girSelection', girKey));
  };

  const setFairwaySelection = (hole, fairwayKey) => {
    setStatsByHole((prev) => toggleHoleSelection(prev, hole, 'fairwaySelection', fairwayKey));
  };

  const updateHoleScore = (hole, delta) => {
    setStatsByHole((prev) => updateHoleScoreValue(prev, hole, delta));
  };

  const replaceHoleStats = (hole, nextHoleStats) => {
    const nextStatsByHole = {
      ...statsByHoleRef.current,
      [hole]: nextHoleStats,
    };
    statsByHoleRef.current = nextStatsByHole;
    setStatsByHole(nextStatsByHole);
  };

  const saveHoleStats = async (hole, nextHoleStats, options = {}) => {
    const nextStatsByHole = {
      ...statsByHoleRef.current,
      [hole]: nextHoleStats,
    };
    statsByHoleRef.current = nextStatsByHole;
    setStatsByHole(nextStatsByHole);

    if (options.persistToServer) {
      return persistRoundStats(nextStatsByHole);
    }

    return true;
  };

  const openWedgeMatrixFromVirtualCaddy = (matrixId) => {
    setShowWedgeMatrixBackToVirtualCaddy(true);
    setPage('wedgeMatrix');
    setWedgeMatrixMode('view');
    setIsWedgeMatrixFormOpen(false);
    setIsWedgeFormOpen(false);
    setEditingWedgeEntryId(null);
    setRecentEntriesMatrixId(null);
    setActiveWedgeMatrixId(matrixId);
  };

  const closeWedgeMatrixBackToVirtualCaddy = () => {
    setShowWedgeMatrixBackToVirtualCaddy(false);
    setPage('virtualCaddy');
  };

  const toggleSetupSelection = (setupKey) => {
    setSetupSelection((prev) => (prev === setupKey ? '' : setupKey));
  };
  const { createCourse, saveCurrentCourse, courseHoleIndexCounts } = useCourseManagement({
    authToken,
    newCourseName,
    setNewCourseName,
    courses,
    setCourses,
    courseEditorId,
    setCourseEditorId,
    setSelectedCourseId,
    setIsLoadingCourses,
    setCoursesError,
    setCourseSaveState,
    courseEditor,
    handleAuthFailure,
  });
  const { addNote, deleteNote } = useRoundNotes({
    authToken,
    selectedRoundId,
    statsByHole,
    roundHandicap,
    selectedCourseId,
    noteDraft,
    roundNotes,
    setRoundNotes,
    setNoteDraft,
    setSaveState,
    setRounds,
    handleAuthFailure,
  });

  const {
    toggleWedgeSelection,
    toggleWedgeSwingClock,
    startWedgeEdit,
    cancelWedgeEdit,
    toggleWedgeMatrixClub,
    setWedgeMatrixSwingClockValue,
    setWedgeMatrixColumnEnabled,
    saveWedgeMatrix,
    startWedgeMatrixEdit,
    cancelWedgeMatrixEdit,
    deleteWedgeMatrix,
    deleteWedgeEntry,
    addWedgeEntry,
  } = useWedgeMatrix({
    authToken,
    wedgeMatrixName,
    wedgeMatrixStanceWidth,
    wedgeMatrixGrip,
    wedgeMatrixBallPosition,
    wedgeMatrixNotes,
    wedgeMatrixClubs,
    wedgeMatrixSwingClocks,
    wedgeMatrixEnabledColumns,
    setWedgeMatrices,
    setWedgeMatrixName,
    setWedgeMatrixStanceWidth,
    setWedgeMatrixGrip,
    setWedgeMatrixBallPosition,
    setWedgeMatrixNotes,
    setWedgeMatrixClubs,
    setWedgeMatrixSwingClocks,
    setWedgeMatrixEnabledColumns,
    setIsWedgeMatrixFormOpen,
    setWedgeMatrixSaveState,
    setWedgeMatricesError,
    editingWedgeMatrixId,
    setEditingWedgeMatrixId,
    activeWedgeMatrixId,
    wedgeMatrices,
    setActiveWedgeMatrixId,
    isWedgeFormOpen,
    setIsWedgeFormOpen,
    wedgeClubSelection,
    setWedgeClubSelection,
    wedgeSwingClock,
    setWedgeSwingClock,
    wedgeDistanceMeters,
    setWedgeDistanceMeters,
    wedgeDistancePaces,
    setWedgeDistancePaces,
    wedgeDistanceUnit,
    setWedgeDistanceUnit,
    wedgeEntriesByMatrix,
    setWedgeEntriesByMatrix,
    editingWedgeEntryId,
    setEditingWedgeEntryId,
    setWedgeEntryError,
    setWedgeEntrySaveState,
    setWedgeEntriesError,
    handleAuthFailure,
  });

  const addShotPrototypeNote = async () => {
    const actualDistanceMetersValue =
      actualDistanceUnit === 'meters' ? Number(actualDistanceMeters) : pacesToMeters(actualDistancePaces);
    const summary = buildShotSummary({
      targetDistanceMeters,
      actualDistanceMeters: actualDistanceMetersValue,
      offlineMeters,
      clubSelection,
      lieSelection,
      setupSelection,
      swingClock,
    });
    if (!summary) {
      return;
    }

    const updatedNotes = [...roundNotes, summary];
    setRoundNotes(updatedNotes);
    setShowDistanceTracker(false);

    if (!authToken || !CLUB_OPTION_SET.has(clubSelection) || actualDistanceMetersValue <= 0) {
      return;
    }

    if (selectedRoundId) {
      setSaveState('saving');
      try {
        const savedRound = await saveRoundToApi(selectedRoundId, statsByHole, updatedNotes, roundHandicap, selectedCourseId, authToken);
        setSaveState('saved');
        setRounds((prev) =>
          prev.map((round) =>
            round.id === selectedRoundId
              ? {
                ...round,
                name: savedRound?.name ?? round.name,
                handicap: savedRound?.handicap ?? round.handicap,
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
    }

    setShotLogSaveState('saving');
    try {
      await saveClubActualToApi({ club: clubSelection, actualMeters: actualDistanceMetersValue }, authToken);
      setClubAveragesDirty(true);
      setClubActualEntriesDirty(true);
      setShotLogSaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

      setShotLogSaveState('error');
    }
  };

  const closeDistanceTracker = () => {
    setShowDistanceTracker(false);
    setShotLogSaveState('idle');
  };

  const deleteClubActualEntry = async (entryId) => {
    if (!authToken) {
      return;
    }

    const previousEntries = clubActualEntries;
    setClubActualEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setClubActualEntriesError('');
    try {
      await deleteClubActualEntryInApi(entryId, authToken);
      setClubAveragesDirty(true);
      setClubActualEntriesDirty(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setClubActualEntries(previousEntries);
      setClubActualEntriesError('Unable to delete shot log right now.');
    }
  };

  const saveVirtualCaddyClubActual = async ({ club, actualMeters }) => {
    if (!authToken) {
      return null;
    }

    const entry = await saveClubActualToApi({ club, actualMeters }, authToken);
    if (entry) {
      setClubActualEntries((prev) => [entry, ...prev.filter((existing) => existing.id !== entry.id)].slice(0, 20));
    }
    setClubAveragesDirty(true);
    setClubActualEntriesDirty(true);
    return entry?.id ?? null;
  };

  const syncVirtualCaddyClubActuals = async ({ roundId, hole, shots }) => {
    if (!authToken || !roundId) {
      return [];
    }

    const entries = await syncVirtualCaddyClubActualsInApi({ roundId, hole, shots }, authToken);
    setClubAveragesDirty(true);
    setClubActualEntriesDirty(true);
    return entries.map((entry) => ({
      shotId: entry.shotId,
      entryId: entry.id,
    }));
  };

  const deleteVirtualCaddyClubActualEntry = async (entryId) => {
    if (!authToken) {
      return;
    }

    setClubActualEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    await deleteClubActualEntryInApi(entryId, authToken);
    setClubAveragesDirty(true);
    setClubActualEntriesDirty(true);
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
    setGoogleAuthError('');
    try {
      const { token, user } = await loginToApi(username, password);
      if (!token) {
        setAuthError('No token was returned.');
        return;
      }

      applyAuthenticatedSession(token, user);
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

    const loadCurrentUser = async () => {
      if (!authToken) {
        return;
      }

      try {
        const user = await loadCurrentUserFromApi(authToken);
        if (isActive) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
        }
      }
    };

    loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleAuth = async () => {
      if (authToken || !isGoogleAuthEnabled() || !googleButtonRef.current) {
        return;
      }

      setIsGoogleLoading(true);
      setGoogleAuthError('');

      try {
        await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) {
          return;
        }

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            if (!credential) {
              setGoogleAuthError('Google sign-in did not return a credential.');
              return;
            }

            setIsGoogleLoading(true);
            setGoogleAuthError('');

            try {
              const { token, user } = await loginWithGoogleInApi(credential);
              if (!token) {
                setGoogleAuthError('No token was returned.');
                return;
              }

              applyAuthenticatedSession(token, user);
            } catch (error) {
              if (error instanceof ApiError) {
                setGoogleAuthError(error.details || 'Unable to sign in with Google right now.');
              } else {
                setGoogleAuthError('Unable to sign in with Google right now.');
              }
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
        });
      } catch (error) {
        if (!cancelled) {
          setGoogleAuthError(error instanceof Error ? error.message : 'Unable to load Google sign-in right now.');
        }
      } finally {
        if (!cancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    initializeGoogleAuth();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleLink = async () => {
      if (!authToken || !currentUser || currentUser.googleLinked || !isGoogleAuthEnabled() || !googleLinkButtonRef.current) {
        return;
      }

      setIsGoogleLinking(true);
      setGoogleLinkError('');

      try {
        await loadGoogleIdentityScript();
        if (cancelled || !googleLinkButtonRef.current || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) {
          return;
        }

        googleLinkButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            if (!credential || !authToken) {
              setGoogleLinkError('Google account link did not return a credential.');
              return;
            }

            setIsGoogleLinking(true);
            setGoogleLinkError('');
            setGoogleLinkSuccess('');

            try {
              const user = await linkGoogleAccountInApi(credential, authToken);
              setCurrentUser(user);
              setGoogleLinkSuccess('Google account linked.');
            } catch (error) {
              if (error instanceof ApiError) {
                if (error.status === 401) {
                  handleAuthFailure('Session expired. Log in again.');
                  return;
                }
                setGoogleLinkError(error.details || 'Unable to link Google account right now.');
              } else {
                setGoogleLinkError('Unable to link Google account right now.');
              }
            } finally {
              setIsGoogleLinking(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleLinkButtonRef.current, {
          theme: 'outline',
          size: 'medium',
          text: 'continue_with',
          shape: 'pill',
          width: 240,
        });
      } catch (error) {
        if (!cancelled) {
          setGoogleLinkError(error instanceof Error ? error.message : 'Unable to load Google linking right now.');
        }
      } finally {
        if (!cancelled) {
          setIsGoogleLinking(false);
        }
      }
    };

    initializeGoogleLink();

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser?.id, currentUser?.googleLinked]);

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
    let isActive = true;

    const loadWedgeMatrices = async () => {
      if (!authToken) {
        return;
      }

      setIsLoadingWedgeMatrices(true);
      setWedgeMatricesError('');
      try {
        const matrices = await loadWedgeMatricesFromApi(authToken);
        if (!isActive) {
          return;
        }

        setWedgeMatrices(matrices);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeMatrices([]);
        setWedgeMatricesError('Unable to load wedge matrices right now.');
      } finally {
        if (isActive) {
          setIsLoadingWedgeMatrices(false);
        }
      }
    };

    loadWedgeMatrices();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  useEffect(() => {
    let isActive = true;

    const loadAllWedgeEntries = async () => {
      if (!authToken || wedgeMatrices.length === 0) {
        return;
      }

      setIsLoadingWedgeEntries(true);
      setWedgeEntriesError('');
      try {
        const entriesByMatrix = {};
        for (const matrix of wedgeMatrices) {
          const entries = await loadWedgeEntriesFromApi(matrix.id, authToken);
          entriesByMatrix[matrix.id] = entries;
        }
        if (!isActive) {
          return;
        }

        setWedgeEntriesByMatrix(entriesByMatrix);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeEntriesByMatrix({});
        setWedgeEntriesError('Unable to load wedge entries right now.');
      } finally {
        if (isActive) {
          setIsLoadingWedgeEntries(false);
        }
      }
    };

    loadAllWedgeEntries();

    return () => {
      isActive = false;
    };
  }, [authToken, wedgeMatrices]);

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
      if (!authToken || page !== 'distance') {
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

  useEffect(() => {
    let isActive = true;

    const loadClubActualEntries = async () => {
      if (!authToken || page !== 'distance' || distanceMode !== 'setup') {
        return;
      }

      if (!clubActualEntriesDirty) {
        return;
      }

      setIsLoadingClubActualEntries(true);
      setClubActualEntriesError('');
      try {
        const entries = await loadClubActualEntriesFromApi(authToken);
        if (!isActive) {
          return;
        }

        const sanitized = entries
          .map((entry) => ({
            id: Number(entry.id),
            club: String(entry.club || ''),
            actualMeters: Number(entry.actualMeters),
            createdAt: entry.createdAt,
          }))
          .filter(
            (entry) =>
              Number.isFinite(entry.id) &&
              entry.id > 0 &&
              entry.club &&
              Number.isFinite(entry.actualMeters) &&
              entry.actualMeters > 0,
          );

        setClubActualEntries(sanitized);
        setClubActualEntriesDirty(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setClubActualEntries([]);
        setClubActualEntriesError('Unable to load shot log right now.');
      } finally {
        if (isActive) {
          setIsLoadingClubActualEntries(false);
        }
      }
    };

    loadClubActualEntries();

    return () => {
      isActive = false;
    };
  }, [authToken, page, distanceMode, clubActualEntriesDirty]);

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
          {isGoogleAuthEnabled() ? (
            <section className="auth-divider">
              <p className="hint">Or use Google</p>
              <div className="google-auth-slot" ref={googleButtonRef} />
              {isGoogleLoading ? <p className="hint">Preparing Google sign-in...</p> : null}
              {googleAuthError ? <p className="hint">{googleAuthError}</p> : null}
            </section>
          ) : null}
        </section>
      </main>
    );
  }

  const isVirtualCaddyShellHidden = page === 'virtualCaddy' && isVirtualCaddyFocusMode;
  const appClassName =
    page === 'track' && saveState === 'unsaved' ? 'app app-has-mobile-save-tray' : isVirtualCaddyShellHidden ? 'app app-focus-mode' : 'app';

  return (
    <main className={appClassName}>
      {!isVirtualCaddyShellHidden ? (
        <header className="header">
          <h1>Golf Stat Tracker</h1>
          {currentUser ? (
            <p className="hint">
              Signed in as {currentUser.displayName || currentUser.username}
              {currentUser.googleLinked ? ' · Google linked' : ''}
            </p>
          ) : null}
          {!showNewRoundForm ? (
            <div className="header-controls">
              <button
                onClick={() => {
                  setNewRoundCourseId(selectedCourseId);
                  setNewRoundHandicap('');
                  setShowNewRoundForm(true);
                }}
                disabled={isSwitchingRound}
              >
                New round
              </button>
              <button onClick={logout} disabled={isSwitchingRound}>
                Log out
              </button>
              <div className="manage-menu">
                <button
                  type="button"
                  onClick={() => setIsManageMenuOpen((prev) => !prev)}
                  disabled={isSwitchingRound}
                  aria-expanded={isManageMenuOpen}
                  aria-haspopup="true"
                >
                  Manage
                </button>
                {isManageMenuOpen ? (
                  <div className="manage-dropdown" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPage('rounds');
                        setIsManageMenuOpen(false);
                      }}
                    >
                      Rounds
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPage('courses');
                        setIsManageMenuOpen(false);
                      }}
                    >
                      Courses
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </header>
      ) : null}
      {currentUser && !currentUser.googleLinked && isGoogleAuthEnabled() ? (
        <section className="card auth-link-card">
          <h2>Link Google</h2>
          <p className="hint">Attach a Google account to this profile so future Google sign-ins use the same data.</p>
          <div className="google-auth-slot" ref={googleLinkButtonRef} />
          {isGoogleLinking ? <p className="hint">Preparing Google account linking...</p> : null}
          {googleLinkError ? <p className="hint">{googleLinkError}</p> : null}
          {googleLinkSuccess ? <p className="hint">{googleLinkSuccess}</p> : null}
        </section>
      ) : null}
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
            <input
              type="number"
              min="0"
              max="54"
              step="1"
              value={newRoundHandicap}
              onChange={(event) => {
                const nextHandicap = sanitizeRoundHandicap(event.target.value);
                setNewRoundHandicap(nextHandicap === '' ? '' : String(nextHandicap));
              }}
              placeholder="Handicap"
              inputMode="numeric"
            />
          </div>
          <div className="new-round-actions">
            <button type="submit" disabled={isSwitchingRound}>
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setNewRoundCourseId('');
                setNewRoundHandicap('');
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
          {!isVirtualCaddyShellHidden ? <SavePill state={saveState} /> : null}

          {!isVirtualCaddyShellHidden ? (
            <PageTabs
              activePage={page}
              onChange={(nextPage) => {
                if (nextPage !== 'wedgeMatrix') {
                  setShowWedgeMatrixBackToVirtualCaddy(false);
                }
                if (nextPage === 'wedgeMatrix' && page !== 'virtualCaddy') {
                  setShowWedgeMatrixBackToVirtualCaddy(false);
                }
                setPage(nextPage);
              }}
              tabs={[
                { key: 'track', label: 'Track', icon: <DistanceTabIcon /> },
                { key: 'virtualCaddy', label: 'Virtual caddy', icon: <VirtualCaddyTabIcon /> },
                { key: 'distance', label: 'Distances', icon: <DistanceTabIcon /> },
                { key: 'wedgeMatrix', label: 'Wedge matrix', icon: <WedgeMatrixTabIcon /> },
                { key: 'totals', label: 'Round totals', icon: <TotalsTabIcon /> },
              ]}
            />
          ) : null}

          {page === 'track' ? (
            <TrackPage
              round={{
                selectedHole,
                displayHoleIndex,
                displayHolePar,
                activeRound,
                activeCourse,
                holeStats,
                statsByHole,
                selectedRoundId,
                saveState,
                isTrackMapOpen,
                teeToGreenMeters: effectiveTeeToGreenMeters,
                mapStatusLabel,
                rotationSupportLabel,
                mapDebugInfo,
              }}
              distance={{
                showDistanceTracker,
                targetDistanceMeters,
                actualDistanceUnit,
                actualDistanceMeters,
                actualDistancePaces,
                offlineMeters,
                clubSelection,
                lieSelection,
                setupSelection,
                swingClock,
                shotLogSaveState,
              }}
              actions={{
                setSelectedHole,
                setShowDistanceTracker,
                setDistanceMode,
                setTargetDistanceMeters,
                setActualDistanceUnit,
                setActualDistanceMeters,
                setActualDistancePaces,
                setOfflineMeters,
                setClubSelection,
                setLieSelection,
                toggleSetupSelection,
                setSwingClock,
                closeDistanceTracker,
                addShotPrototypeNote,
                updateHoleScore,
                setFairwaySelection,
                updateStats,
                setGirSelection,
                saveCurrentRound,
                saveAndNextHole,
                setIsTrackMapOpen,
              }}
              map={{
                googleMapsMapId: GOOGLE_MAPS_MAP_ID,
                googleMapsApiKey: GOOGLE_MAPS_API_KEY,
                mapContainerRef,
              }}
              helpers={{ metersToPaces, pacesToMeters }}
            />
          ) : page === 'virtualCaddy' ? (
            <VirtualCaddyPage
              round={{
                selectedHole,
                displayHoleIndex,
                displayHolePar,
                activeRound,
                activeCourse,
                holeStats,
                statsByHole,
                saveState,
                teeToGreenMeters: effectiveTeeToGreenMeters,
                clubCarryByClub,
                wedgeMatrices,
                wedgeEntriesByMatrix,
                isFocusMode: isVirtualCaddyFocusMode,
              }}
              actions={{
                setSelectedHole,
                saveCurrentRound,
                replaceHoleStats,
                saveHoleStats,
                saveClubActual: saveVirtualCaddyClubActual,
                syncVirtualCaddyClubActuals,
                deleteClubActualEntry: deleteVirtualCaddyClubActualEntry,
                onToggleFocusMode: () => setIsVirtualCaddyFocusMode((prev) => !prev),
                onOpenWedgeMatrix: openWedgeMatrixFromVirtualCaddy,
              }}
            />
          ) : page === 'courses' ? (
            <CoursesPage
              state={{
                newCourseName,
                isLoadingCourses,
                coursesError,
                courses,
                courseEditorId,
                courseEditor,
                courseSaveState,
                courseHoleIndexCounts,
                isMapSetupOpen,
                mapSetupHole,
                teeToGreenMeters: effectiveTeeToGreenMeters,
                mapStatus,
                mapStatusLabel,
                rotationSupportLabel,
                mapPlacementLabel,
                mapPlacementMode,
                mapDebugInfo,
              }}
              actions={{
                setNewCourseName,
                createCourse,
                setCourseEditorId,
                setIsMapSetupOpen,
                setMapPlacementMode,
                setMapSetupHole,
                setCourseSaveState,
                setCourses,
                saveCurrentCourse,
                setTeeToGreenMeters,
              }}
              map={{
                googleMapsMapId: GOOGLE_MAPS_MAP_ID,
                googleMapsApiKey: GOOGLE_MAPS_API_KEY,
                selectedHoleRef,
                mapContainerRef,
              }}
            />
          ) : page === 'totals' ? (
            <TotalsPage
              activeRoundName={activeRound?.name}
              activeRoundHandicap={roundHandicap}
              totals={totals}
            />
          ) : page === 'rounds' ? (
            <RoundsPage
              selectedRoundId={selectedRoundId}
              switchRound={switchRound}
              isSwitchingRound={isSwitchingRound}
              rounds={rounds}
              deleteRound={deleteRound}
              roundSummariesError={roundSummariesError}
              roundSummaries={roundSummaries}
              roundSummariesState={roundSummariesState}
            />
          ) : page === 'distance' ? (
            <DistancePage
              state={{
                distanceMode,
                isLoadingClubActualEntries,
                clubActualEntriesError,
                clubActualEntries,
                isLoadingClubAverages,
                clubAveragesError,
                clubAverages,
                clubCarryByClub,
                clubCarrySaveState,
              }}
              actions={{
                setDistanceMode,
                setClubActualEntriesDirty,
                deleteClubActualEntry,
                setCarryForClub,
                saveClubCarry,
              }}
            />
          ) : page === 'wedgeMatrix' ? (
            <WedgeMatrixPage
              state={{
                wedgeMatrixMode,
                isWedgeMatrixFormOpen,
                editingWedgeMatrixId,
                wedgeMatrixName,
                wedgeMatrixClubs,
                wedgeMatrixStanceWidth,
                wedgeMatrixGrip,
                wedgeMatrixBallPosition,
                wedgeMatrixNotes,
                wedgeMatrixSwingClocks,
                wedgeMatrixEnabledColumns,
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
                showBackToVirtualCaddy: showWedgeMatrixBackToVirtualCaddy,
              }}
              actions={{
                setWedgeMatrixMode,
                setIsWedgeMatrixFormOpen,
                setWedgeMatricesError,
                saveWedgeMatrix,
                startWedgeMatrixEdit,
                cancelWedgeMatrixEdit,
                setEditingWedgeMatrixId,
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
                onBackToVirtualCaddy: closeWedgeMatrixBackToVirtualCaddy,
              }}
              helpers={{ buildWedgeMatrixRows, sortClubsByDefaultOrder, metersToPaces, pacesToMeters }}
            />
          ) : null}

          {!isVirtualCaddyFocusMode ? (
            <NotesSection
              noteDraft={noteDraft}
              setNoteDraft={setNoteDraft}
              addNote={addNote}
              roundNotes={roundNotes}
              deleteNote={deleteNote}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
