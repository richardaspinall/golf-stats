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
  wedgeMatrixGroupName: string;
  wedgeMatrixStanceWidth: string;
  wedgeMatrixGrip: string;
  wedgeMatrixBallPosition: string;
  wedgeMatrixNotes: string;
  wedgeMatrixCurrentRoundAdjustments: string;
  wedgeMatrixClubs: string[];
  wedgeMatrixSwingClocks: string[];
  wedgeMatrixEnabledColumns: boolean[];
  wedgeMatrixCalculationMode: 'entries' | 'setValues' | 'freeform';
  wedgeMatrixSetValues: Record<string, Record<string, number | string>>;
  setWedgeMatrices: Dispatch<SetStateAction<WedgeMatrix[]>>;
  setWedgeMatrixName: Dispatch<SetStateAction<string>>;
  setWedgeMatrixGroupName: Dispatch<SetStateAction<string>>;
  setWedgeMatrixStanceWidth: Dispatch<SetStateAction<string>>;
  setWedgeMatrixGrip: Dispatch<SetStateAction<string>>;
  setWedgeMatrixBallPosition: Dispatch<SetStateAction<string>>;
  setWedgeMatrixNotes: Dispatch<SetStateAction<string>>;
  setWedgeMatrixCurrentRoundAdjustments: Dispatch<SetStateAction<string>>;
  setWedgeMatrixClubs: Dispatch<SetStateAction<string[]>>;
  setWedgeMatrixSwingClocks: Dispatch<SetStateAction<string[]>>;
  setWedgeMatrixEnabledColumns: Dispatch<SetStateAction<boolean[]>>;
  setWedgeMatrixCalculationMode: Dispatch<SetStateAction<'entries' | 'setValues' | 'freeform'>>;
  setWedgeMatrixSetValues: Dispatch<SetStateAction<Record<string, Record<string, number | string>>>>;
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
  wedgeFreeformValue: string;
  setWedgeFreeformValue: Dispatch<SetStateAction<string>>;
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
  wedgeMatrixGroupName,
  wedgeMatrixStanceWidth,
  wedgeMatrixGrip,
  wedgeMatrixBallPosition,
  wedgeMatrixNotes,
  wedgeMatrixCurrentRoundAdjustments,
  wedgeMatrixClubs,
  wedgeMatrixSwingClocks,
  wedgeMatrixEnabledColumns,
  wedgeMatrixCalculationMode,
  wedgeMatrixSetValues,
  setWedgeMatrices,
  setWedgeMatrixName,
  setWedgeMatrixGroupName,
  setWedgeMatrixStanceWidth,
  setWedgeMatrixGrip,
  setWedgeMatrixBallPosition,
  setWedgeMatrixNotes,
  setWedgeMatrixCurrentRoundAdjustments,
  setWedgeMatrixClubs,
  setWedgeMatrixSwingClocks,
  setWedgeMatrixEnabledColumns,
  setWedgeMatrixCalculationMode,
  setWedgeMatrixSetValues,
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
  wedgeFreeformValue,
  setWedgeFreeformValue,
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
    setWedgeFreeformValue('');
    setWedgeEntryError('');
    setWedgeEntrySaveState('idle');
    setIsWedgeFormOpen(true);
  };

  const cancelWedgeEdit = () => {
    setEditingWedgeEntryId(null);
    setWedgeEntryError('');
    setIsWedgeFormOpen(false);
    setWedgeFreeformValue('');
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

  const changeWedgeMatrixCalculationMode = (calculationMode: 'entries' | 'setValues' | 'freeform') => {
    setWedgeMatrixCalculationMode(calculationMode);
    if (!editingWedgeMatrixId || !authToken) {
      return;
    }

    const existingMatrix = wedgeMatrices.find((matrix) => matrix.id === editingWedgeMatrixId);
    if (!existingMatrix) {
      return;
    }

    updateWedgeMatrixInApi({ ...existingMatrix, calculationMode }, authToken)
      .then((saved) => {
        if (!saved) {
          setWedgeMatrixCalculationMode(existingMatrix.calculationMode);
          setWedgeMatricesError('Unable to update matrix value mode.');
          return;
        }
        setWedgeMatrices((previous) => previous.map((matrix) => (matrix.id === saved.id ? saved : matrix)));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }
        setWedgeMatrixCalculationMode(existingMatrix.calculationMode);
        setWedgeMatricesError('Unable to update matrix value mode.');
      });
  };

  const resetWedgeMatrixForm = () => {
    setWedgeMatrixName('');
    setWedgeMatrixGroupName('');
    setWedgeMatrixStanceWidth('');
    setWedgeMatrixGrip('');
    setWedgeMatrixBallPosition('');
    setWedgeMatrixNotes('');
    setWedgeMatrixCurrentRoundAdjustments('');
    setWedgeMatrixClubs([]);
    setWedgeMatrixSwingClocks([...SWING_CLOCK_OPTIONS]);
    setWedgeMatrixEnabledColumns([true, true, true, true]);
    setWedgeMatrixCalculationMode('entries');
    setWedgeMatrixSetValues({});
    setEditingWedgeMatrixId(null);
    setWedgeFreeformValue('');
  };

  const startWedgeMatrixEdit = (matrix: WedgeMatrix) => {
    const savedSwingClocks = Array.isArray(matrix.swingClocks) && matrix.swingClocks.length > 0 ? matrix.swingClocks : [...SWING_CLOCK_OPTIONS];
    const nextSwingClocks = Array.from({ length: SWING_CLOCK_OPTIONS.length }, (_, index) => savedSwingClocks[index] || SWING_CLOCK_OPTIONS[index]);

    setEditingWedgeMatrixId(matrix.id);
    setWedgeMatrixName(matrix.name || '');
    setWedgeMatrixGroupName(matrix.groupName || '');
    setWedgeMatrixStanceWidth(matrix.stanceWidth || '');
    setWedgeMatrixGrip(matrix.grip || '');
    setWedgeMatrixBallPosition(matrix.ballPosition || '');
    setWedgeMatrixNotes(matrix.notes || '');
    setWedgeMatrixCurrentRoundAdjustments(matrix.currentRoundAdjustments || '');
    setWedgeMatrixClubs(Array.isArray(matrix.clubs) ? matrix.clubs : []);
    setWedgeMatrixSwingClocks(nextSwingClocks);
    setWedgeMatrixEnabledColumns(
      Array.from({ length: SWING_CLOCK_OPTIONS.length }, (_, index) =>
        index === 0 ? true : Boolean(savedSwingClocks[index]),
      ),
    );
    setWedgeMatrixCalculationMode(matrix.calculationMode);
    setWedgeMatrixSetValues(matrix.setValues);
    setWedgeFreeformValue('');
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
      groupName: wedgeMatrixGroupName,
      sortOrder:
        editingWedgeMatrixId
          ? wedgeMatrices.find((matrix) => matrix.id === editingWedgeMatrixId)?.sortOrder ?? 0
          : wedgeMatrices.filter((matrix) => (matrix.groupName || '') === wedgeMatrixGroupName).length,
      stanceWidth: wedgeMatrixStanceWidth,
      grip: wedgeMatrixGrip,
      ballPosition: wedgeMatrixBallPosition,
      notes: wedgeMatrixNotes,
      currentRoundAdjustments: wedgeMatrixCurrentRoundAdjustments,
      clubs: wedgeMatrixClubs,
      swingClocks: wedgeMatrixSwingClocks.reduce<string[]>((acc, clock, index) => {
        if (index > 0 && !wedgeMatrixEnabledColumns[index]) {
          return acc;
        }
        acc.push(clock.trim() ? clock : SWING_CLOCK_OPTIONS[index]);
        return acc;
      }, []),
      calculationMode: wedgeMatrixCalculationMode,
      setValues: wedgeMatrixSetValues,
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

  const moveWedgeMatrix = async (matrixId: number, direction: 'up' | 'down') => {
    const source = wedgeMatrices.find((matrix) => matrix.id === matrixId);
    if (!source || !authToken) {
      return;
    }

    const groupMatrices = wedgeMatrices
      .filter((matrix) => (matrix.groupName || '') === (source.groupName || ''))
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = groupMatrices.findIndex((matrix) => matrix.id === matrixId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const target = groupMatrices[targetIndex];
    if (index < 0 || !target) {
      return;
    }

    const nextMatrices = wedgeMatrices.map((matrix) => {
      if (matrix.id === source.id) {
        return { ...matrix, sortOrder: target.sortOrder };
      }
      if (matrix.id === target.id) {
        return { ...matrix, sortOrder: source.sortOrder };
      }
      return matrix;
    });
    setWedgeMatrices(nextMatrices);

    try {
      await Promise.all([
        updateWedgeMatrixInApi({ ...source, sortOrder: target.sortOrder }, authToken),
        updateWedgeMatrixInApi({ ...target, sortOrder: source.sortOrder }, authToken),
      ]);
    } catch (error) {
      setWedgeMatrices(wedgeMatrices);
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setWedgeMatricesError('Unable to reorder matrixes right now.');
    }
  };

  const clearCurrentRoundAdjustments = async (matrixId: number) => {
    const matrix = wedgeMatrices.find((item) => item.id === matrixId);
    if (!matrix || !authToken) {
      return;
    }

    try {
      const saved = await updateWedgeMatrixInApi({ ...matrix, currentRoundAdjustments: '' }, authToken);
      if (!saved) {
        setWedgeMatricesError('Unable to clear current round adjustments right now.');
        return;
      }
      setWedgeMatrices((prev) => prev.map((item) => (item.id === matrixId ? saved : item)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }
      setWedgeMatricesError('Unable to clear current round adjustments right now.');
    }
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

  const saveWedgeMatrixSetValue = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setWedgeEntryError('');

    if (!Number.isFinite(activeWedgeMatrixId)) {
      setWedgeEntryError('Select a wedge matrix.');
      return;
    }

    const activeMatrix = wedgeMatrices.find((matrix) => matrix.id === activeWedgeMatrixId);
    if (!activeMatrix || (activeMatrix.calculationMode !== 'setValues' && activeMatrix.calculationMode !== 'freeform')) {
      setWedgeEntryError('This matrix is not using fixed values.');
      return;
    }
    const activeMatrixClubs = Array.isArray(activeMatrix.clubs) && activeMatrix.clubs.length > 0 ? activeMatrix.clubs : CLUB_OPTIONS;
    const activeMatrixSwingClocks =
      Array.isArray(activeMatrix.swingClocks) && activeMatrix.swingClocks.length > 0 ? activeMatrix.swingClocks : SWING_CLOCK_OPTIONS;
    if (!activeMatrixClubs.includes(wedgeClubSelection)) {
      setWedgeEntryError('Select a club.');
      return;
    }
    if (!activeMatrixSwingClocks.includes(wedgeSwingClock)) {
      setWedgeEntryError('Select a swing clock.');
      return;
    }

    const nextValue =
      activeMatrix.calculationMode === 'freeform'
        ? wedgeFreeformValue.trim()
        : wedgeDistanceUnit === 'paces'
          ? pacesToMeters(Number(wedgeDistancePaces))
          : Math.round(Number(wedgeDistanceMeters));
    if (activeMatrix.calculationMode === 'freeform') {
      if (!String(nextValue)) {
        setWedgeEntryError('Enter a value.');
        return;
      }
    } else if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setWedgeEntryError('Enter a distance.');
      return;
    }
    if (!authToken) {
      return;
    }

    const setValues = {
      ...activeMatrix.setValues,
      [wedgeClubSelection]: {
        ...(activeMatrix.setValues[wedgeClubSelection] || {}),
        [wedgeSwingClock]: nextValue,
      },
    };
    setWedgeEntrySaveState('saving');
    updateWedgeMatrixInApi({ ...activeMatrix, setValues }, authToken)
      .then((saved) => {
        if (!saved) {
          setWedgeEntrySaveState('error');
          setWedgeEntryError('Unable to save matrix value.');
          return;
        }
        setWedgeMatrices((previous) => previous.map((matrix) => (matrix.id === saved.id ? saved : matrix)));
        setWedgeFreeformValue('');
        setWedgeEntrySaveState('saved');
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleAuthFailure('Session expired. Log in again.');
          return;
        }
        setWedgeEntrySaveState('error');
        setWedgeEntryError('Unable to save matrix value.');
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
    changeWedgeMatrixCalculationMode,
    saveWedgeMatrix,
    startWedgeMatrixEdit,
    cancelWedgeMatrixEdit,
    deleteWedgeMatrix,
    moveWedgeMatrix,
    clearCurrentRoundAdjustments,
    deleteWedgeEntry,
    addWedgeEntry,
    saveWedgeMatrixSetValue,
  };
}
