import type { Dispatch, FormEvent, SetStateAction } from 'react';

import {
  ApiError,
  createWedgeMatrixInApi,
  deleteWedgeEntryInApi,
  deleteWedgeMatrixInApi,
  saveWedgeEntryToApi,
  updateWedgeMatrixInApi,
  updateWedgeEntryInApi,
} from '../lib/api';
import { CLUB_OPTIONS, SWING_CLOCK_OPTIONS } from '../lib/constants';
import { metersToPaces, pacesToMeters } from '../lib/geometry';
import type { WedgeEntry, WedgeMatrix } from '../types';

type WedgeEntriesState = Record<number, WedgeEntry[]>;

type TempWedgeEntry = {
  id: string;
  matrixId: number;
  club: string;
  swingClock: string;
  distanceMeters: number;
  createdAt: string;
};

type UseWedgeMatrixArgs = {
  authToken: string;
  wedgeMatrixName: string;
  wedgeMatrixStanceWidth: string;
  wedgeMatrixGrip: string;
  wedgeMatrixBallPosition: string;
  wedgeMatrixNotes: string;
  wedgeMatrixClubs: string[];
  wedgeMatrixSwingClocks: string[];
  wedgeMatrixEnabledColumns: boolean[];
  setWedgeMatrices: Dispatch<SetStateAction<WedgeMatrix[]>>;
  setWedgeMatrixName: Dispatch<SetStateAction<string>>;
  setWedgeMatrixStanceWidth: Dispatch<SetStateAction<string>>;
  setWedgeMatrixGrip: Dispatch<SetStateAction<string>>;
  setWedgeMatrixBallPosition: Dispatch<SetStateAction<string>>;
  setWedgeMatrixNotes: Dispatch<SetStateAction<string>>;
  setWedgeMatrixClubs: Dispatch<SetStateAction<string[]>>;
  setWedgeMatrixSwingClocks: Dispatch<SetStateAction<string[]>>;
  setWedgeMatrixEnabledColumns: Dispatch<SetStateAction<boolean[]>>;
  setIsWedgeMatrixFormOpen: Dispatch<SetStateAction<boolean>>;
  setWedgeMatrixSaveState: Dispatch<SetStateAction<string>>;
  setWedgeMatricesError: Dispatch<SetStateAction<string>>;
  editingWedgeMatrixId: number | null;
  setEditingWedgeMatrixId: Dispatch<SetStateAction<number | null>>;
  activeWedgeMatrixId: number | null;
  wedgeMatrices: WedgeMatrix[];
  setActiveWedgeMatrixId: Dispatch<SetStateAction<number | null>>;
  isWedgeFormOpen: boolean;
  setIsWedgeFormOpen: Dispatch<SetStateAction<boolean>>;
  wedgeClubSelection: string;
  setWedgeClubSelection: Dispatch<SetStateAction<string>>;
  wedgeSwingClock: string;
  setWedgeSwingClock: Dispatch<SetStateAction<string>>;
  wedgeDistanceMeters: number;
  setWedgeDistanceMeters: Dispatch<SetStateAction<number>>;
  wedgeDistancePaces: number;
  setWedgeDistancePaces: Dispatch<SetStateAction<number>>;
  wedgeDistanceUnit: string;
  setWedgeDistanceUnit: Dispatch<SetStateAction<string>>;
  wedgeEntriesByMatrix: WedgeEntriesState;
  setWedgeEntriesByMatrix: Dispatch<SetStateAction<WedgeEntriesState>>;
  editingWedgeEntryId: number | null;
  setEditingWedgeEntryId: Dispatch<SetStateAction<number | null>>;
  setWedgeEntryError: Dispatch<SetStateAction<string>>;
  setWedgeEntrySaveState: Dispatch<SetStateAction<string>>;
  setWedgeEntriesError: Dispatch<SetStateAction<string>>;
  handleAuthFailure: (message?: string) => void;
};

export function useWedgeMatrix({
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
  setWedgeEntriesByMatrix,
  editingWedgeEntryId,
  setEditingWedgeEntryId,
  setWedgeEntryError,
  setWedgeEntrySaveState,
  setWedgeEntriesError,
  handleAuthFailure,
}: UseWedgeMatrixArgs) {
  const toggleWedgeSelection = (club: string) => {
    setWedgeClubSelection((prev) => (prev === club ? '' : club));
  };

  const toggleWedgeSwingClock = (clock: string) => {
    setWedgeSwingClock((prev) => (prev === clock ? '' : clock));
  };

  const startWedgeEdit = (entry: WedgeEntry) => {
    setEditingWedgeEntryId(entry.id);
    setActiveWedgeMatrixId(entry.matrixId);
    setWedgeClubSelection(entry.club);
    setWedgeSwingClock(entry.swingClock);
    setWedgeDistanceMeters(entry.distanceMeters);
    setWedgeDistancePaces(metersToPaces(entry.distanceMeters));
    setWedgeDistanceUnit('meters');
    setWedgeEntryError('');
    setWedgeEntrySaveState('idle');
    setIsWedgeFormOpen(true);
  };

  const cancelWedgeEdit = () => {
    setEditingWedgeEntryId(null);
    setWedgeEntryError('');
    setIsWedgeFormOpen(false);
  };

  const toggleWedgeMatrixClub = (club: string) => {
    if (!CLUB_OPTIONS.includes(club)) {
      return;
    }
    setWedgeMatrixClubs((prev) => (prev.includes(club) ? prev.filter((item) => item !== club) : [...prev, club]));
  };

  const setWedgeMatrixSwingClockValue = (index: number, value: string) => {
    if (!Number.isInteger(index) || index < 0) {
      return;
    }
    setWedgeMatrixSwingClocks((prev) => {
      const next = prev.length > 0 ? [...prev] : [...SWING_CLOCK_OPTIONS];
      while (next.length <= index) {
        next.push('');
      }
      next[index] = value.slice(0, 40);
      return next;
    });
  };

  const setWedgeMatrixColumnEnabled = (index: number, enabled: boolean) => {
    if (!Number.isInteger(index) || index <= 0 || index >= SWING_CLOCK_OPTIONS.length) {
      return;
    }

    setWedgeMatrixEnabledColumns((prev) => {
      const next = prev.length === SWING_CLOCK_OPTIONS.length ? [...prev] : [true, true, true, true];
      next[0] = true;
      next[index] = enabled;
      return next;
    });
  };

  const resetWedgeMatrixForm = () => {
    setWedgeMatrixName('');
    setWedgeMatrixStanceWidth('');
    setWedgeMatrixGrip('');
    setWedgeMatrixBallPosition('');
    setWedgeMatrixNotes('');
    setWedgeMatrixClubs([]);
    setWedgeMatrixSwingClocks([...SWING_CLOCK_OPTIONS]);
    setWedgeMatrixEnabledColumns([true, true, true, true]);
    setEditingWedgeMatrixId(null);
  };

  const startWedgeMatrixEdit = (matrix: WedgeMatrix) => {
    const savedSwingClocks = Array.isArray(matrix.swingClocks) && matrix.swingClocks.length > 0 ? matrix.swingClocks : [...SWING_CLOCK_OPTIONS];
    const nextSwingClocks = Array.from({ length: SWING_CLOCK_OPTIONS.length }, (_, index) => savedSwingClocks[index] || SWING_CLOCK_OPTIONS[index]);

    setEditingWedgeMatrixId(matrix.id);
    setWedgeMatrixName(matrix.name || '');
    setWedgeMatrixStanceWidth(matrix.stanceWidth || '');
    setWedgeMatrixGrip(matrix.grip || '');
    setWedgeMatrixBallPosition(matrix.ballPosition || '');
    setWedgeMatrixNotes(matrix.notes || '');
    setWedgeMatrixClubs(Array.isArray(matrix.clubs) ? matrix.clubs : []);
    setWedgeMatrixSwingClocks(nextSwingClocks);
    setWedgeMatrixEnabledColumns(
      Array.from({ length: SWING_CLOCK_OPTIONS.length }, (_, index) =>
        index === 0 ? true : Boolean(savedSwingClocks[index]),
      ),
    );
    setWedgeMatricesError('');
    setWedgeMatrixSaveState('idle');
    setIsWedgeMatrixFormOpen(true);
  };

  const cancelWedgeMatrixEdit = () => {
    resetWedgeMatrixForm();
    setIsWedgeMatrixFormOpen(false);
    setWedgeMatricesError('');
    setWedgeMatrixSaveState('idle');
  };

  const saveWedgeMatrix = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!authToken) {
      return;
    }

    setWedgeMatrixSaveState('saving');
    const payload = {
      name: wedgeMatrixName || 'Wedge matrix',
      stanceWidth: wedgeMatrixStanceWidth,
      grip: wedgeMatrixGrip,
      ballPosition: wedgeMatrixBallPosition,
      notes: wedgeMatrixNotes,
      clubs: wedgeMatrixClubs,
      swingClocks: wedgeMatrixSwingClocks.reduce<string[]>((acc, clock, index) => {
        if (index > 0 && !wedgeMatrixEnabledColumns[index]) {
          return acc;
        }
        acc.push(clock.trim() ? clock : SWING_CLOCK_OPTIONS[index]);
        return acc;
      }, []),
    };
    const request = editingWedgeMatrixId
      ? updateWedgeMatrixInApi({ id: editingWedgeMatrixId, ...payload }, authToken)
      : createWedgeMatrixInApi(payload, authToken);

    request
      .then((matrix) => {
        if (!matrix) {
          setWedgeMatrixSaveState('error');
          setWedgeMatricesError(editingWedgeMatrixId ? 'Unable to update wedge matrix right now.' : 'Unable to create wedge matrix right now.');
          return;
        }

        setWedgeMatrices((prev) =>
          editingWedgeMatrixId ? prev.map((item) => (item.id === editingWedgeMatrixId ? matrix : item)) : [matrix, ...prev],
        );
        resetWedgeMatrixForm();
        setIsWedgeMatrixFormOpen(false);
        setWedgeMatrixSaveState('saved');
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeMatrixSaveState('error');
        setWedgeMatricesError(editingWedgeMatrixId ? 'Unable to update wedge matrix right now.' : 'Unable to create wedge matrix right now.');
      });
  };

  const deleteWedgeMatrix = (matrixId: number) => {
    if (!authToken || !Number.isFinite(matrixId)) {
      return;
    }
    if (!window.confirm('Delete this wedge matrix and its entries?')) {
      return;
    }

    setWedgeMatrixSaveState('saving');
    deleteWedgeMatrixInApi(matrixId, authToken)
      .then(() => {
        setWedgeMatrices((prev) => prev.filter((matrix) => matrix.id !== matrixId));
        setWedgeEntriesByMatrix((prev) => {
          const next = { ...prev };
          delete next[matrixId];
          return next;
        });
        if (activeWedgeMatrixId === matrixId) {
          setActiveWedgeMatrixId(null);
          setIsWedgeFormOpen(false);
          setEditingWedgeEntryId(null);
        }
        if (editingWedgeMatrixId === matrixId) {
          resetWedgeMatrixForm();
          setIsWedgeMatrixFormOpen(false);
        }
        setWedgeMatrixSaveState('saved');
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeMatrixSaveState('error');
        setWedgeMatricesError('Unable to delete wedge matrix right now.');
      });
  };

  const deleteWedgeEntry = (entryId: number, matrixId: number) => {
    if (!authToken || !Number.isFinite(entryId) || !Number.isFinite(matrixId)) {
      return;
    }
    if (!window.confirm('Delete this wedge entry?')) {
      return;
    }

    setWedgeEntrySaveState('saving');
    let previousEntries: WedgeEntry[] = [];
    setWedgeEntriesByMatrix((prev) => {
      previousEntries = prev[matrixId] || [];
      return {
        ...prev,
        [matrixId]: (prev[matrixId] || []).filter((entry) => entry.id !== entryId),
      };
    });

    deleteWedgeEntryInApi(entryId, authToken)
      .then(() => {
        setWedgeEntrySaveState('saved');
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeEntrySaveState('error');
        setWedgeEntriesByMatrix((prev) => ({
          ...prev,
          [matrixId]: previousEntries,
        }));
        setWedgeEntriesError('Unable to delete wedge entry right now.');
      });
  };

  const addWedgeEntry = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setWedgeEntryError('');

    if (!Number.isFinite(activeWedgeMatrixId)) {
      setWedgeEntryError('Select a wedge matrix.');
      return;
    }

    const activeMatrix = wedgeMatrices.find((matrix) => matrix.id === activeWedgeMatrixId);
    const activeMatrixClubs =
      activeMatrix && Array.isArray(activeMatrix.clubs) && activeMatrix.clubs.length > 0 ? activeMatrix.clubs : CLUB_OPTIONS;
    const activeMatrixSwingClocks =
      activeMatrix && Array.isArray(activeMatrix.swingClocks) && activeMatrix.swingClocks.length > 0
        ? activeMatrix.swingClocks
        : SWING_CLOCK_OPTIONS;

    if (!activeMatrixClubs.includes(wedgeClubSelection)) {
      setWedgeEntryError('Select a club.');
      return;
    }
    if (!activeMatrixSwingClocks.includes(wedgeSwingClock)) {
      setWedgeEntryError('Select a swing clock.');
      return;
    }

    const rawDistance = wedgeDistanceUnit === 'paces' ? Number(wedgeDistancePaces) : Number(wedgeDistanceMeters);
    const distanceMeters = wedgeDistanceUnit === 'paces' ? pacesToMeters(rawDistance) : Math.round(rawDistance);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      setWedgeEntryError('Enter a distance.');
      return;
    }

    if (editingWedgeEntryId) {
      if (!authToken) {
        return;
      }

      setWedgeEntrySaveState('saving');
      updateWedgeEntryInApi(
        {
          id: editingWedgeEntryId,
          matrixId: activeWedgeMatrixId,
          club: wedgeClubSelection,
          swingClock: wedgeSwingClock,
          distanceMeters,
        },
        authToken,
      )
        .then((saved) => {
          if (!saved) {
            setWedgeEntrySaveState('error');
            setWedgeEntryError('Unable to save wedge entry.');
            return;
          }

          setWedgeEntriesByMatrix((prev) => {
            const existing = prev[activeWedgeMatrixId] || [];
            const withoutOld = existing.filter((item) => item.id !== editingWedgeEntryId);
            return {
              ...prev,
              [activeWedgeMatrixId]: [saved, ...withoutOld],
            };
          });
          setEditingWedgeEntryId(null);
          setWedgeEntrySaveState('saved');
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            handleAuthFailure('Session expired. Log in again.');
            return;
          }

          setWedgeEntrySaveState('error');
          setWedgeEntryError('Unable to save wedge entry.');
        });
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: TempWedgeEntry = {
      id: tempId,
      matrixId: activeWedgeMatrixId,
      club: wedgeClubSelection,
      swingClock: wedgeSwingClock,
      distanceMeters,
      createdAt: new Date().toISOString(),
    };

    setWedgeEntriesByMatrix((prev) => ({
      ...prev,
      [activeWedgeMatrixId]: [entry as unknown as WedgeEntry, ...(prev[activeWedgeMatrixId] || [])],
    }));
    setWedgeEntrySaveState('idle');

    if (!authToken) {
      return;
    }

    setWedgeEntrySaveState('saving');
    saveWedgeEntryToApi(
      { matrixId: activeWedgeMatrixId, club: wedgeClubSelection, swingClock: wedgeSwingClock, distanceMeters },
      authToken,
    )
      .then((saved) => {
        if (!saved) {
          setWedgeEntrySaveState('error');
          setWedgeEntriesByMatrix((prev) => ({
            ...prev,
            [activeWedgeMatrixId]: (prev[activeWedgeMatrixId] || []).filter((item) => item.id !== (tempId as never)),
          }));
          setWedgeEntryError('Unable to save wedge entry.');
          return;
        }

        setWedgeEntriesByMatrix((prev) => {
          const existing = prev[activeWedgeMatrixId] || [];
          const withoutTemp = existing.filter((item) => item.id !== (tempId as never));
          return {
            ...prev,
            [activeWedgeMatrixId]: [saved, ...withoutTemp],
          };
        });
        setWedgeEntrySaveState('saved');
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }

        setWedgeEntrySaveState('error');
        setWedgeEntriesByMatrix((prev) => ({
          ...prev,
          [activeWedgeMatrixId]: (prev[activeWedgeMatrixId] || []).filter((item) => item.id !== (tempId as never)),
        }));
        setWedgeEntryError('Unable to save wedge entry.');
      });
  };

  return {
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
  };
}
