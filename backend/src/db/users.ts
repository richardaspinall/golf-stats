import { hashPassword, verifyPassword } from '../auth/crypto.js';
import { toIso } from './utils.js';
import { getPool } from './pool.js';
import type { User } from '../domain/types.js';

const sanitizeUsername = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);

const sanitizeDisplayName = (value: unknown, fallback: string) => String(value || '').trim().slice(0, 80) || fallback;
const sanitizeEmail = (value: unknown) => String(value || '').trim().toLowerCase().slice(0, 160);
const sanitizeGoogleSub = (value: unknown) => String(value || '').trim().slice(0, 255);
const buildUserId = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const buildGoogleUsernameBase = (email: string, displayName: string) => {
  const emailBase = email.split('@')[0] || '';
  const displayBase = String(displayName || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return sanitizeUsername(emailBase || displayBase || 'golfer') || 'golfer';
};

const findAvailableUsername = async (baseUsername: string) => {
  const db = getPool();
  const normalizedBase = sanitizeUsername(baseUsername) || 'golfer';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : sanitizeUsername(`${normalizedBase}${attempt + 1}`);
    const existing = await db.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [candidate]);
    if (existing.rows.length === 0) {
      return candidate;
    }
  }

  return sanitizeUsername(`${normalizedBase}${Date.now().toString().slice(-6)}`) || `golfer${Date.now().toString().slice(-6)}`;
};

const mapDbUser = (row: any): User => ({
  id: String(row.id),
  username: sanitizeUsername(row.username),
  displayName: sanitizeDisplayName(row.display_name, sanitizeUsername(row.username)),
  email: sanitizeEmail(row.email),
  authMethod: row.password_hash ? 'local' : 'google',
  googleLinked: Boolean(row.google_sub),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const createUser = async ({
  username,
  password,
  displayName,
}: {
  username: unknown;
  password: unknown;
  displayName?: unknown;
}) => {
  const safeUsername = sanitizeUsername(username);
  const safePassword = String(password || '');
  if (!safeUsername) {
    throw new Error('Username is required');
  }
  if (safePassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const db = getPool();
  const existing = await db.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [safeUsername]);
  if (existing.rows.length > 0) {
    throw new Error('Username already exists');
  }

  const now = new Date().toISOString();
  const result = await db.query(
    `
      INSERT INTO users (id, username, password_hash, display_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
      RETURNING id, username, display_name, email, google_sub, password_hash, created_at, updated_at
    `,
    [
      buildUserId(),
      safeUsername,
      await hashPassword(safePassword),
      sanitizeDisplayName(displayName, safeUsername),
      now,
      now,
    ],
  );

  return mapDbUser(result.rows[0]);
};

export const getUserById = async (userId: string) => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, username, display_name, email, google_sub, password_hash, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );
  return result.rows[0] ? mapDbUser(result.rows[0]) : null;
};

export const getUserByCredentials = async ({ username, password }: { username: unknown; password: unknown }) => {
  const safeUsername = sanitizeUsername(username);
  const safePassword = String(password || '');
  if (!safeUsername || !safePassword) {
    return null;
  }

  const db = getPool();
  const result = await db.query(
    'SELECT id, username, display_name, email, google_sub, password_hash, created_at, updated_at FROM users WHERE username = $1 LIMIT 1',
    [safeUsername],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  if (!row.password_hash) {
    return null;
  }

  const isValid = await verifyPassword(safePassword, String(row.password_hash || ''));
  if (!isValid) {
    return null;
  }

  return mapDbUser(row);
};

export const getGoogleUserBySub = async ({
  googleSub,
  email,
  displayName,
}: {
  googleSub: unknown;
  email: unknown;
  displayName: unknown;
}) => {
  const safeGoogleSub = sanitizeGoogleSub(googleSub);
  const safeEmail = sanitizeEmail(email);
  const safeDisplayName = sanitizeDisplayName(displayName, buildGoogleUsernameBase(safeEmail, String(displayName || '')));

  if (!safeGoogleSub || !safeEmail) {
    throw new Error('Invalid Google profile');
  }

  const db = getPool();
  const existing = await db.query(
    'SELECT id, username, display_name, email, google_sub, password_hash, created_at, updated_at FROM users WHERE google_sub = $1 LIMIT 1',
    [safeGoogleSub],
  );
  if (!existing.rows[0]) {
    return null;
  }

  const current = existing.rows[0];
  const needsUpdate = sanitizeEmail(current.email) !== safeEmail || sanitizeDisplayName(current.display_name, '') !== safeDisplayName;
  if (needsUpdate) {
    const updated = await db.query(
    `
      UPDATE users
      SET email = $2,
          display_name = $3,
          updated_at = $4::timestamptz
      WHERE google_sub = $1
      RETURNING id, username, display_name, email, google_sub, password_hash, created_at, updated_at
    `,
      [safeGoogleSub, safeEmail, safeDisplayName, new Date().toISOString()],
    );
    return mapDbUser(updated.rows[0]);
  }

  return mapDbUser(current);
};

export const linkGoogleAccount = async ({
  userId,
  googleSub,
  email,
  displayName,
}: {
  userId: string;
  googleSub: unknown;
  email: unknown;
  displayName: unknown;
}) => {
  const safeGoogleSub = sanitizeGoogleSub(googleSub);
  const safeEmail = sanitizeEmail(email);
  const safeDisplayName = sanitizeDisplayName(displayName, safeEmail.split('@')[0] || 'Golfer');

  if (!userId || !safeGoogleSub || !safeEmail) {
    throw new Error('Invalid Google profile');
  }

  const db = getPool();
  const claimed = await db.query(
    'SELECT id FROM users WHERE google_sub = $1 LIMIT 1',
    [safeGoogleSub],
  );
  if (claimed.rows[0] && String(claimed.rows[0].id) !== userId) {
    throw new Error('That Google account is already linked to another user');
  }

  const result = await db.query(
    `
      UPDATE users
      SET google_sub = $2,
          email = CASE WHEN email = '' THEN $3 ELSE email END,
          display_name = CASE WHEN display_name = username THEN $4 ELSE display_name END,
          updated_at = $5::timestamptz
      WHERE id = $1
      RETURNING id, username, display_name, email, google_sub, password_hash, created_at, updated_at
    `,
    [userId, safeGoogleSub, safeEmail, safeDisplayName, new Date().toISOString()],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapDbUser(result.rows[0]);
};
