import { getPool } from './pool.js';
import { AUTH_PASSWORD, AUTH_USERNAME, LEGACY_BOOTSTRAP_AUTH } from '../config/env.js';
import { hashPassword } from '../auth/crypto.js';

let schemaReadyPromise: Promise<void> | null = null;

export const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    const client = getPool();
    schemaReadyPromise = client
      .query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rounds (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          round_date TEXT NOT NULL DEFAULT '',
          handicap INTEGER NOT NULL DEFAULT 0,
          course_id TEXT,
          stats_by_hole JSONB NOT NULL,
          notes JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          markers JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS club_carry (
          user_id TEXT,
          club TEXT NOT NULL,
          carry_meters INTEGER NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS club_actual_distances (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          club TEXT NOT NULL,
          actual_meters INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS wedge_entries (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          club TEXT NOT NULL,
          swing_clock TEXT NOT NULL,
          distance_meters INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS wedge_matrices (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          stance_width TEXT NOT NULL,
          grip TEXT NOT NULL,
          ball_position TEXT NOT NULL,
          notes TEXT NOT NULL,
          clubs JSONB NOT NULL DEFAULT '[]'::jsonb,
          swing_clocks JSONB NOT NULL DEFAULT '["7:30","9:00","10:30","Full"]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL
        );
        ALTER TABLE wedge_entries ADD COLUMN IF NOT EXISTS matrix_id BIGINT;
        ALTER TABLE wedge_matrices ADD COLUMN IF NOT EXISTS clubs JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE wedge_matrices ADD COLUMN IF NOT EXISTS swing_clocks JSONB NOT NULL DEFAULT '["7:30","9:00","10:30","Full"]'::jsonb;
        ALTER TABLE rounds ADD COLUMN IF NOT EXISTS round_date TEXT NOT NULL DEFAULT '';
        ALTER TABLE rounds ADD COLUMN IF NOT EXISTS handicap INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE rounds ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE rounds ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE club_carry ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE club_actual_distances ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE wedge_entries ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE wedge_matrices ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE club_carry DROP CONSTRAINT IF EXISTS club_carry_pkey;
        CREATE UNIQUE INDEX IF NOT EXISTS club_carry_user_club_key ON club_carry(user_id, club);
        CREATE INDEX IF NOT EXISTS rounds_user_updated_idx ON rounds(user_id, updated_at DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS club_actual_distances_user_created_idx ON club_actual_distances(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS wedge_matrices_user_created_idx ON wedge_matrices(user_id, created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS wedge_entries_user_matrix_created_idx ON wedge_entries(user_id, matrix_id, created_at DESC, id DESC);
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rounds_user_id_fk') THEN
            ALTER TABLE rounds ADD CONSTRAINT rounds_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_carry_user_id_fk') THEN
            ALTER TABLE club_carry ADD CONSTRAINT club_carry_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_actual_distances_user_id_fk') THEN
            ALTER TABLE club_actual_distances ADD CONSTRAINT club_actual_distances_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wedge_entries_user_id_fk') THEN
            ALTER TABLE wedge_entries ADD CONSTRAINT wedge_entries_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wedge_matrices_user_id_fk') THEN
            ALTER TABLE wedge_matrices ADD CONSTRAINT wedge_matrices_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `)
      .then(async () => {
        if (!LEGACY_BOOTSTRAP_AUTH) {
          return;
        }

        const username = AUTH_USERNAME.trim();
        if (!username) {
          return;
        }

        const existing = await client.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [username]);
        if (existing.rows.length > 0) {
          return;
        }

        const now = new Date().toISOString();
        const passwordHash = await hashPassword(AUTH_PASSWORD);
        await client.query(
          `
            INSERT INTO users (id, username, password_hash, display_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
          `,
          [`user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, username, passwordHash, username, now, now],
        );
      })
      .then(() => undefined);
  }

  await schemaReadyPromise;
};
