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

const mapDbUser = (row: any): User => ({
  id: String(row.id),
  username: sanitizeUsername(row.username),
  displayName: sanitizeDisplayName(row.display_name, sanitizeUsername(row.username)),
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
      RETURNING id, username, display_name, created_at, updated_at
    `,
    [
      `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    'SELECT id, username, display_name, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
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
    'SELECT id, username, display_name, password_hash, created_at, updated_at FROM users WHERE username = $1 LIMIT 1',
    [safeUsername],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const isValid = await verifyPassword(safePassword, String(row.password_hash || ''));
  if (!isValid) {
    return null;
  }

  return mapDbUser(row);
};
