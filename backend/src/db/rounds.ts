import { getPool } from './pool.js';
import { toIso } from './utils.js';
import { sanitizeRoundDate, sanitizeRoundHandicap, sanitizeRoundName, sanitizeRoundNotes, sanitizeStats } from '../domain/sanitize.js';
import type { Round, StatsByHole } from '../domain/types.js';

type RoundUpdate = {
  name: string;
  roundDate: string;
  handicap: number;
  courseId: string | null;
  statsByHole: StatsByHole;
  notes: string[];
  updatedAt: string;
};

const mapDbRound = (row: any): Round => ({
  id: String(row.id),
  name: sanitizeRoundName(row.name),
  roundDate: sanitizeRoundDate(row.round_date),
  handicap: sanitizeRoundHandicap(row.handicap),
  courseId: row.course_id ? String(row.course_id) : '',
  statsByHole: sanitizeStats(row.stats_by_hole),
  notes: sanitizeRoundNotes(row.notes),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const listRounds = async () => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, round_date, handicap, course_id, created_at, updated_at FROM rounds ORDER BY updated_at DESC, created_at DESC',
  );

  return result.rows.map((row: any) => ({
    id: String(row.id),
    name: sanitizeRoundName(row.name),
    roundDate: sanitizeRoundDate(row.round_date),
    handicap: sanitizeRoundHandicap(row.handicap),
    courseId: row.course_id ? String(row.course_id) : '',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
};

export const getRoundById = async (roundId: string) => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, round_date, handicap, course_id, stats_by_hole, notes, created_at, updated_at FROM rounds WHERE id = $1 LIMIT 1',
    [roundId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDbRound(result.rows[0]);
};

export const insertRound = async (round: Round) => {
  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO rounds (id, name, round_date, handicap, course_id, stats_by_hole, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::timestamptz, $9::timestamptz)
      RETURNING id, name, round_date, handicap, course_id, stats_by_hole, notes, created_at, updated_at
    `,
    [
      round.id,
      round.name,
      round.roundDate,
      round.handicap,
      round.courseId || null,
      JSON.stringify(round.statsByHole),
      JSON.stringify(round.notes),
      round.createdAt,
      round.updatedAt,
    ],
  );

  return mapDbRound(result.rows[0]);
};

export const updateRound = async (roundId: string, updates: RoundUpdate) => {
  const db = getPool();
  const result = await db.query(
    `
      UPDATE rounds
      SET name = $2,
          round_date = $3,
          handicap = $4,
          course_id = $5,
          stats_by_hole = $6::jsonb,
          notes = $7::jsonb,
          updated_at = $8::timestamptz
      WHERE id = $1
      RETURNING id, name, round_date, handicap, course_id, stats_by_hole, notes, created_at, updated_at
    `,
    [
      roundId,
      updates.name,
      updates.roundDate,
      sanitizeRoundHandicap(updates.handicap),
      updates.courseId || null,
      JSON.stringify(updates.statsByHole),
      JSON.stringify(updates.notes),
      updates.updatedAt,
    ],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDbRound(result.rows[0]);
};

export const deleteRoundById = async (roundId: string) => {
  const db = getPool();
  const result = await db.query('DELETE FROM rounds WHERE id = $1 RETURNING id', [roundId]);
  return result.rows.length > 0;
};
