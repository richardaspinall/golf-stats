import { AUTH_TOKEN_STORAGE_KEY } from './config';

const ROUND_DRAFT_STORAGE_PREFIX = 'golf-stats-round-draft:';

export const loadStoredAuthToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
};

export const saveAuthToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

type StoredRoundDraft = {
  statsByHole: unknown;
  roundHandicap: unknown;
  roundNotes: unknown;
  selectedCourseId: unknown;
};

const getRoundDraftStorageKey = (roundId: string): string => `${ROUND_DRAFT_STORAGE_PREFIX}${roundId}`;

export const loadStoredRoundDraft = (roundId: string): StoredRoundDraft | null => {
  if (typeof window === 'undefined' || !roundId) {
    return null;
  }

  const raw = window.localStorage.getItem(getRoundDraftStorageKey(roundId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredRoundDraft) : null;
  } catch {
    return null;
  }
};

export const saveStoredRoundDraft = (roundId: string, draft: StoredRoundDraft): void => {
  if (typeof window === 'undefined' || !roundId) {
    return;
  }

  window.localStorage.setItem(getRoundDraftStorageKey(roundId), JSON.stringify(draft));
};

export const clearStoredRoundDraft = (roundId: string): void => {
  if (typeof window === 'undefined' || !roundId) {
    return;
  }

  window.localStorage.removeItem(getRoundDraftStorageKey(roundId));
};
