const normalizeApiBaseUrl = (rawValue: unknown): string => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) {
    return 'http://localhost:3001';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/\/$/, '')}`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const API_ROUNDS_URL = `${API_BASE_URL}/api/rounds`;
export const API_COURSES_URL = `${API_BASE_URL}/api/courses`;
export const API_CLUB_CARRY_URL = `${API_BASE_URL}/api/club-carry`;
export const API_CLUB_ACTUALS_URL = `${API_BASE_URL}/api/club-actuals`;
export const API_WEDGE_ENTRIES_URL = `${API_BASE_URL}/api/wedge-entries`;
export const API_WEDGE_MATRICES_URL = `${API_BASE_URL}/api/wedge-matrices`;
export const API_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;
export const API_GOOGLE_LOGIN_URL = `${API_BASE_URL}/api/auth/google`;
export const API_USERS_URL = `${API_BASE_URL}/api/users`;
export const API_ME_URL = `${API_BASE_URL}/api/me`;
export const API_GOOGLE_LINK_URL = `${API_BASE_URL}/api/me/google-link`;
export const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
export const GOOGLE_MAPS_MAP_ID = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '').trim();
export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const DEFAULT_MAP_CENTER = { lat: -37.815, lng: 144.963 };
export const AUTH_TOKEN_STORAGE_KEY = 'golf_stats_auth_token';
