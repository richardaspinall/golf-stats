import type { Dispatch, FormEvent, SetStateAction } from 'react';

import { ApiError, saveRoundToApi } from '../lib/api';
import { sanitizeNoteText } from '../lib/rounds';
import type { RoundListItem, StatsByHole } from '../types';

type UseRoundNotesArgs = {
  authToken: string;
  selectedRoundId: string;
  statsByHole: StatsByHole;
  roundHandicap: number;
  selectedCourseId: string;
  noteDraft: string;
  roundNotes: string[];
  setRoundNotes: Dispatch<SetStateAction<string[]>>;
  setNoteDraft: Dispatch<SetStateAction<string>>;
  setSaveState: Dispatch<SetStateAction<string>>;
  setRounds: Dispatch<SetStateAction<RoundListItem[]>>;
  handleAuthFailure: (message?: string) => void;
};

const applySavedRoundSummary = (
  roundId: string,
  savedRound: { name?: string; handicap?: number; courseId?: string | null; updatedAt?: string } | null,
  setRounds: Dispatch<SetStateAction<RoundListItem[]>>,
) => {
  setRounds((prev) =>
    prev.map((round) =>
      round.id === roundId
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
};

export function useRoundNotes({
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
}: UseRoundNotesArgs) {
  const persistNotes = async (nextNotes: string[]) => {
    if (!authToken || !selectedRoundId) {
      return;
    }

    setSaveState('saving');
    try {
      const savedRound = await saveRoundToApi(selectedRoundId, statsByHole, nextNotes, roundHandicap, selectedCourseId, authToken);
      setSaveState('saved');
      applySavedRoundSummary(selectedRoundId, savedRound, setRounds);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthFailure('Session expired. Log in again.');
        return;
      }

      setSaveState('error');
    }
  };

  const addNote = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const next = sanitizeNoteText(noteDraft);
    if (!next) {
      return;
    }

    const updatedNotes = [...roundNotes, next];
    setRoundNotes(updatedNotes);
    setNoteDraft('');
    await persistNotes(updatedNotes);
  };

  const deleteNote = async (indexToDelete: number) => {
    const updatedNotes = roundNotes.filter((_, index) => index !== indexToDelete);
    setRoundNotes(updatedNotes);
    await persistNotes(updatedNotes);
  };

  return { addNote, deleteNote };
}
