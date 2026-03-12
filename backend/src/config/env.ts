import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..', '..');
loadEnv({ path: path.join(backendRoot, '.env') });
loadEnv({ path: path.join(backendRoot, '.env.local'), override: true });

const normalizeOrigin = (rawValue: string | undefined) => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed || trimmed === '*') {
    return '*';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/\/$/, '')}`;
};

export const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
export const AUTH_USERNAME = String(process.env.AUTH_USERNAME || '').trim();
export const AUTH_PASSWORD = String(process.env.AUTH_PASSWORD || '');
export const JWT_SECRET = String(process.env.JWT_SECRET || '');
export const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24 * 7);
export const CORS_ORIGIN = normalizeOrigin(process.env.CORS_ORIGIN || '*');

export const DB_CONFIGURED = Boolean(DATABASE_URL);
export const AUTH_CONFIGURED = Boolean(DB_CONFIGURED && JWT_SECRET);
export const LEGACY_BOOTSTRAP_AUTH = Boolean(AUTH_USERNAME && AUTH_PASSWORD);
