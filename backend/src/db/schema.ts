import { getPool } from './pool.js';

let schemaReadyPromise: Promise<void> | null = null;

export const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    const client = getPool();
    schemaReadyPromise = client
      .query(`
        CREATE TABLE IF NOT EXISTS rounds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
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
          club TEXT PRIMARY KEY,
          carry_meters INTEGER NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS club_actual_distances (
          id BIGSERIAL PRIMARY KEY,
          club TEXT NOT NULL,
          actual_meters INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
        ALTER TABLE rounds ADD COLUMN IF NOT EXISTS course_id TEXT;
      `)
      .then(() => undefined);
  }

  await schemaReadyPromise;
};
