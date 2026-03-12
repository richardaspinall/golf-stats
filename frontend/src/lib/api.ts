import {
  API_CLUB_ACTUALS_URL,
  API_CLUB_CARRY_URL,
  API_COURSES_URL,
  API_LOGIN_URL,
  API_ROUNDS_URL,
  API_USERS_URL,
  API_WEDGE_ENTRIES_URL,
  API_WEDGE_MATRICES_URL,
} from './config';
import { CLUB_OPTIONS } from './constants';
import { normalizeWedgeMatrix, sanitizeCarryByClub, sanitizeRoundHandicap, sanitizeWedgeEntry } from './rounds';
import type { CarryByClub, ClubAverage, CourseMarkers, Round, RoundListItem, UserProfile, WedgeEntry, WedgeMatrix } from '../types';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  status: number;
  details: string;

  constructor(message: string, status: number, details = '') {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const getErrorDetails = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data?.error || '';
  } catch {
    return '';
  }
};

const requestApi = async (url: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<Response> => {
  const headers: Record<string, string> = {};
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

export const loginToApi = async (username: string, password: string): Promise<{ token: string; user: UserProfile | null }> => {
  const response = await requestApi(API_LOGIN_URL, {
    method: 'POST',
    body: { username, password },
  });

  if (!response.ok) {
    throw new ApiError(`Login failed (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return {
    token: String(data?.token || ''),
    user: data?.user || null,
  };
};

export const createUserInApi = async ({
  username,
  password,
  displayName,
}: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<UserProfile> => {
  const response = await requestApi(API_USERS_URL, {
    method: 'POST',
    body: { username, password, displayName },
  });

  if (!response.ok) {
    throw new ApiError(`Failed to create user (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return data?.user;
};

export const loadRoundsFromApi = async (token: string): Promise<RoundListItem[]> => {
  const response = await requestApi(API_ROUNDS_URL, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load rounds (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!Array.isArray(data?.rounds)) {
    return [];
  }

  return data.rounds.map((round) => ({
    ...round,
    handicap: sanitizeRoundHandicap(round?.handicap) || 0,
  }));
};

export const loadCoursesFromApi = async (token: string): Promise<Array<Record<string, unknown>>> => {
  const response = await requestApi(API_COURSES_URL, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load courses (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return Array.isArray(data?.courses) ? data.courses : [];
};

export const createCourseInApi = async (name: string, token: string): Promise<Record<string, unknown>> => {
  const response = await requestApi(API_COURSES_URL, {
    method: 'POST',
    body: { name },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to create course (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return data?.course;
};

export const updateCourseInApi = async (
  courseId: string,
  name: string,
  markers: CourseMarkers,
  token: string,
): Promise<Record<string, unknown>> => {
  const response = await requestApi(`${API_COURSES_URL}/${encodeURIComponent(courseId)}`, {
    method: 'PUT',
    body: { name, markers },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to save course (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return data?.course;
};

export const loadRoundFromApi = async (roundId: string, token: string): Promise<Round | null> => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load round (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!data?.round) {
    return null;
  }

  return {
    ...data.round,
    handicap: sanitizeRoundHandicap(data.round?.handicap) || 0,
  };
};

export const saveRoundToApi = async (
  roundId: string,
  statsByHole: Round['statsByHole'],
  notes: string[],
  handicap: number,
  courseId: string,
  token: string,
): Promise<Round | null> => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'PUT',
    body: { statsByHole, notes, handicap, courseId },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to save round (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!data?.round) {
    return null;
  }

  return {
    ...data.round,
    handicap: sanitizeRoundHandicap(data.round?.handicap) || 0,
  };
};

export const createRoundInApi = async (
  name: string,
  roundDate: string,
  handicap: number,
  courseId: string,
  token: string,
): Promise<Round | null> => {
  const response = await requestApi(API_ROUNDS_URL, {
    method: 'POST',
    body: { name, roundDate, handicap, courseId },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to create round (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!data?.round) {
    return null;
  }

  return {
    ...data.round,
    handicap: sanitizeRoundHandicap(data.round?.handicap) || 0,
  };
};

export const deleteRoundInApi = async (roundId: string, token: string): Promise<void> => {
  const response = await requestApi(`${API_ROUNDS_URL}/${encodeURIComponent(roundId)}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to delete round (${response.status})`, response.status, await getErrorDetails(response));
  }
};

export const loadClubCarryFromApi = async (token: string): Promise<CarryByClub> => {
  const response = await requestApi(API_CLUB_CARRY_URL, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load club carry (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return sanitizeCarryByClub(data?.carryByClub);
};

export const saveClubCarryToApi = async (carryByClub: CarryByClub, token: string): Promise<CarryByClub> => {
  const response = await requestApi(API_CLUB_CARRY_URL, {
    method: 'PUT',
    body: { carryByClub },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to save club carry (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return sanitizeCarryByClub(data?.carryByClub);
};

export const saveClubActualToApi = async (
  { club, actualMeters }: { club: string; actualMeters: number },
  token: string,
): Promise<void> => {
  const response = await requestApi(API_CLUB_ACTUALS_URL, {
    method: 'POST',
    body: { club, actualMeters },
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to save shot actual (${response.status})`, response.status, await getErrorDetails(response));
  }
};

export const loadClubActualAveragesFromApi = async (token: string): Promise<ClubAverage[]> => {
  const response = await requestApi(API_CLUB_ACTUALS_URL, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load club averages (${response.status})`, response.status, await getErrorDetails(response));
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

export const loadWedgeEntriesFromApi = async (matrixId: number | string, token: string): Promise<WedgeEntry[]> => {
  const response = await requestApi(`${API_WEDGE_ENTRIES_URL}?matrixId=${encodeURIComponent(String(matrixId))}`, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load wedge entries (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!Array.isArray(data?.entries)) {
    return [];
  }

  return data.entries.map((entry: unknown) => sanitizeWedgeEntry(entry)).filter(Boolean);
};

export const saveWedgeEntryToApi = async (
  payload: { matrixId: number; club: string; swingClock: string; distanceMeters: number },
  token: string,
): Promise<WedgeEntry | null> => {
  const response = await requestApi(API_WEDGE_ENTRIES_URL, {
    method: 'POST',
    body: payload,
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to save wedge entry (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return sanitizeWedgeEntry(data?.entry);
};

export const updateWedgeEntryInApi = async (
  payload: { id: number; matrixId: number; club: string; swingClock: string; distanceMeters: number },
  token: string,
): Promise<WedgeEntry | null> => {
  const response = await requestApi(`${API_WEDGE_ENTRIES_URL}/${encodeURIComponent(String(payload.id))}`, {
    method: 'PUT',
    body: payload,
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to update wedge entry (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return sanitizeWedgeEntry(data?.entry);
};

export const loadWedgeMatricesFromApi = async (token: string): Promise<WedgeMatrix[]> => {
  const response = await requestApi(API_WEDGE_MATRICES_URL, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load wedge matrices (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  if (!Array.isArray(data?.matrices)) {
    return [];
  }

  return data.matrices.map((matrix: unknown) => normalizeWedgeMatrix(matrix));
};

export const createWedgeMatrixInApi = async (
  payload: { name: string; stanceWidth: string; grip: string; ballPosition: string; notes: string; clubs: string[]; swingClocks: string[] },
  token: string,
): Promise<WedgeMatrix | null> => {
  const response = await requestApi(API_WEDGE_MATRICES_URL, {
    method: 'POST',
    body: payload,
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to create wedge matrix (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return data?.matrix ? normalizeWedgeMatrix(data.matrix) : null;
};

export const updateWedgeMatrixInApi = async (
  payload: { id: number; name: string; stanceWidth: string; grip: string; ballPosition: string; notes: string; clubs: string[]; swingClocks: string[] },
  token: string,
): Promise<WedgeMatrix | null> => {
  const response = await requestApi(`${API_WEDGE_MATRICES_URL}/${encodeURIComponent(String(payload.id))}`, {
    method: 'PUT',
    body: payload,
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to update wedge matrix (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return data?.matrix ? normalizeWedgeMatrix(data.matrix) : null;
};

export const loadClubActualEntriesFromApi = async (token: string): Promise<Array<Record<string, unknown>>> => {
  const response = await requestApi(`${API_CLUB_ACTUALS_URL}/entries`, { token });
  if (!response.ok) {
    throw new ApiError(`Failed to load shot log (${response.status})`, response.status, await getErrorDetails(response));
  }

  const data = await response.json();
  return Array.isArray(data?.entries) ? data.entries : [];
};

export const deleteClubActualEntryInApi = async (entryId: number | string, token: string): Promise<void> => {
  const response = await requestApi(`${API_CLUB_ACTUALS_URL}/entries/${encodeURIComponent(String(entryId))}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to delete shot log (${response.status})`, response.status, await getErrorDetails(response));
  }
};

export const deleteWedgeMatrixInApi = async (id: number | string, token: string): Promise<void> => {
  const response = await requestApi(`${API_WEDGE_MATRICES_URL}/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to delete wedge matrix (${response.status})`, response.status, await getErrorDetails(response));
  }
};

export const deleteWedgeEntryInApi = async (id: number | string, token: string): Promise<void> => {
  const response = await requestApi(`${API_WEDGE_ENTRIES_URL}/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    throw new ApiError(`Failed to delete wedge entry (${response.status})`, response.status, await getErrorDetails(response));
  }
};
