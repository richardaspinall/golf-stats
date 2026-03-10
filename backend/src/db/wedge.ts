import { sanitizeWedgeDistanceMeters } from '../domain/sanitize.js';
import { isClubOption, isSwingClockOption } from '../domain/guards.js';
import type { ClubOption, SwingClockOption, WedgeEntry, WedgeMatrix } from '../domain/types.js';
import { getPool } from './pool.js';

const sanitizeTextField = (value: unknown, max = 120) => String(value || '').trim().slice(0, max);
const sanitizeClubList = (value: unknown): ClubOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((club) => String(club || '').trim())
    .filter((club, index, arr) => isClubOption(club) && arr.indexOf(club) === index) as ClubOption[];
};

export const listWedgeMatrices = async () => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT id,
             name,
             stance_width,
             grip,
             ball_position,
             notes,
             clubs,
             created_at
      FROM wedge_matrices
      ORDER BY created_at DESC, id DESC
    `,
  );

  return result.rows.reduce((acc: WedgeMatrix[], row: any) => {
    const id = Number(row.id);
    if (!Number.isFinite(id)) {
      return acc;
    }
    acc.push({
      id: Math.floor(id),
      name: String(row.name || ''),
      stanceWidth: String(row.stance_width || ''),
      grip: String(row.grip || ''),
      ballPosition: String(row.ball_position || ''),
      notes: String(row.notes || ''),
      clubs: sanitizeClubList(row.clubs),
      createdAt: String(row.created_at || ''),
    });
    return acc;
  }, []);
};

export const insertWedgeMatrix = async ({
  name,
  stanceWidth,
  grip,
  ballPosition,
  notes,
  clubs,
}: {
  name: string;
  stanceWidth: string;
  grip: string;
  ballPosition: string;
  notes: string;
  clubs: ClubOption[];
}) => {
  const safeName = sanitizeTextField(name, 80) || 'Wedge matrix';
  const safeStanceWidth = sanitizeTextField(stanceWidth, 120);
  const safeGrip = sanitizeTextField(grip, 120);
  const safeBallPosition = sanitizeTextField(ballPosition, 120);
  const safeNotes = sanitizeTextField(notes, 400);
  const safeClubs = sanitizeClubList(clubs);

  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO wedge_matrices (name, stance_width, grip, ball_position, notes, clubs, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
      RETURNING id, name, stance_width, grip, ball_position, notes, clubs, created_at
    `,
    [safeName, safeStanceWidth, safeGrip, safeBallPosition, safeNotes, JSON.stringify(safeClubs), new Date().toISOString()],
  );

  const row = result.rows[0] || {};
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    stanceWidth: String(row.stance_width || ''),
    grip: String(row.grip || ''),
    ballPosition: String(row.ball_position || ''),
    notes: String(row.notes || ''),
    clubs: sanitizeClubList(row.clubs),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeMatrix;
};

export const deleteWedgeMatrix = async (id: number) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const db = getPool();
  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM wedge_entries WHERE matrix_id = $1', [id]);
    const result = await db.query('DELETE FROM wedge_matrices WHERE id = $1', [id]);
    await db.query('COMMIT');
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

export const listWedgeEntries = async (matrixId?: number | null) => {
  const db = getPool();
  const params = [];
  let filterClause = '';
  if (Number.isFinite(matrixId)) {
    filterClause = 'WHERE matrix_id = $1';
    params.push(matrixId);
  }
  const result = await db.query(
    `
      SELECT id,
             club,
             swing_clock,
             distance_meters,
             created_at,
             matrix_id
      FROM wedge_entries
      ${filterClause}
      ORDER BY created_at DESC, id DESC
      LIMIT 500
    `,
    params,
  );

  return result.rows.reduce((acc: WedgeEntry[], row: any) => {
    const club = String(row.club || '');
    const swingClock = String(row.swing_clock || '');
    const distanceMeters = Number(row.distance_meters);
    const createdAt = String(row.created_at || '');
    const id = Number(row.id);
    const matrixId = Number(row.matrix_id);
    if (!isClubOption(club) || !isSwingClockOption(swingClock)) {
      return acc;
    }
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return acc;
    }
    if (!Number.isFinite(id) || !Number.isFinite(matrixId)) {
      return acc;
    }

    acc.push({
      id: Math.floor(id),
      matrixId: Math.floor(matrixId),
      club,
      swingClock,
      distanceMeters: Math.round(distanceMeters),
      createdAt,
    });
    return acc;
  }, []);
};

export const insertWedgeEntry = async ({
  matrixId,
  club,
  swingClock,
  distanceMeters,
}: {
  matrixId: number;
  club: string;
  swingClock: string;
  distanceMeters: unknown;
}) => {
  if (!Number.isFinite(matrixId) || matrixId <= 0) {
    throw new Error('Invalid matrix');
  }

  if (!isClubOption(club)) {
    throw new Error('Invalid club');
  }
  if (!isSwingClockOption(swingClock)) {
    throw new Error('Invalid swing clock');
  }

  const sanitizedDistance = sanitizeWedgeDistanceMeters(distanceMeters);
  if (sanitizedDistance === null) {
    throw new Error('Invalid distance');
  }

  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO wedge_entries (matrix_id, club, swing_clock, distance_meters, created_at)
      VALUES ($1, $2, $3, $4, $5::timestamptz)
      RETURNING id, matrix_id, club, swing_clock, distance_meters, created_at
    `,
    [matrixId, club, swingClock, sanitizedDistance, new Date().toISOString()],
  );

  const row = result.rows[0] || {};
  const savedClub = String(row.club || '') as ClubOption;
  const savedSwingClock = String(row.swing_clock || '') as SwingClockOption;
  return {
    id: Number(row.id),
    matrixId: Number(row.matrix_id),
    club: savedClub,
    swingClock: savedSwingClock,
    distanceMeters: Number(row.distance_meters),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeEntry;
};

export const updateWedgeEntry = async ({
  id,
  matrixId,
  club,
  swingClock,
  distanceMeters,
}: {
  id: number;
  matrixId: number;
  club: string;
  swingClock: string;
  distanceMeters: unknown;
}) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  if (!Number.isFinite(matrixId) || matrixId <= 0) {
    throw new Error('Invalid matrix');
  }

  if (!isClubOption(club)) {
    throw new Error('Invalid club');
  }
  if (!isSwingClockOption(swingClock)) {
    throw new Error('Invalid swing clock');
  }

  const sanitizedDistance = sanitizeWedgeDistanceMeters(distanceMeters);
  if (sanitizedDistance === null) {
    throw new Error('Invalid distance');
  }

  const db = getPool();
  const result = await db.query(
    `
      UPDATE wedge_entries
      SET matrix_id = $1,
          club = $2,
          swing_clock = $3,
          distance_meters = $4
      WHERE id = $5
      RETURNING id, matrix_id, club, swing_clock, distance_meters, created_at
    `,
    [matrixId, club, swingClock, sanitizedDistance, id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    matrixId: Number(row.matrix_id),
    club: String(row.club || '') as ClubOption,
    swingClock: String(row.swing_clock || '') as SwingClockOption,
    distanceMeters: Number(row.distance_meters),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeEntry;
};

export const deleteWedgeEntry = async (id: number) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const db = getPool();
  const result = await db.query('DELETE FROM wedge_entries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
