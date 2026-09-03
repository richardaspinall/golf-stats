import { sanitizeWedgeDistanceMeters } from '../domain/sanitize.js';
import { normalizeClubLabel, SWING_CLOCK_OPTIONS } from '../constants.js';
import { isClubOption } from '../domain/guards.js';
import type { ClubOption, WedgeEntry, WedgeMatrix } from '../domain/types.js';
import { getPool } from './pool.js';

const sanitizeTextField = (value: unknown, max = 120) => String(value || '').trim().slice(0, max);
const sanitizeClubList = (value: unknown): ClubOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((club) => normalizeClubLabel(club))
    .filter((club, index, arr) => isClubOption(club) && arr.indexOf(club) === index) as ClubOption[];
};
const sanitizeSwingClockLabel = (value: unknown, max = 40) => String(value || '').trim().slice(0, max);
const sanitizeSwingClockList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((clock) => sanitizeSwingClockLabel(clock))
    .filter((clock, index, arr) => Boolean(clock) && arr.indexOf(clock) === index);
};
const resolveSwingClockList = (value: unknown): string[] => {
  const sanitized = sanitizeSwingClockList(value);
  return sanitized.length > 0 ? sanitized : [...SWING_CLOCK_OPTIONS];
};
const sanitizeCalculationMode = (value: unknown): 'entries' | 'setValues' => (value === 'setValues' ? 'setValues' : 'entries');
const sanitizeSetValues = (value: unknown): Record<string, Record<string, number>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Record<string, number>>>((values, [club, clocks]) => {
    const normalizedClub = normalizeClubLabel(club);
    if (!isClubOption(normalizedClub) || !clocks || typeof clocks !== 'object' || Array.isArray(clocks)) {
      return values;
    }
    const sanitizedClocks = Object.entries(clocks as Record<string, unknown>).reduce<Record<string, number>>((clubValues, [clock, distance]) => {
      const safeClock = sanitizeSwingClockLabel(clock);
      const numericDistance = Number(distance);
      if (safeClock && Number.isFinite(numericDistance) && numericDistance > 0) {
        clubValues[safeClock] = Math.min(500, Math.round(numericDistance));
      }
      return clubValues;
    }, {});
    if (Object.keys(sanitizedClocks).length > 0) {
      values[normalizedClub] = sanitizedClocks;
    }
    return values;
  }, {});
};

export const listWedgeMatrices = async (userId: string) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT id,
             name,
             group_name,
             sort_order,
             stance_width,
             grip,
             ball_position,
             notes,
             current_round_adjustments,
             clubs,
             swing_clocks,
             calculation_mode,
             set_values,
             created_at
      FROM wedge_matrices
      WHERE user_id = $1
      ORDER BY CASE WHEN group_name = '' THEN 1 ELSE 0 END, lower(group_name), sort_order ASC, created_at DESC, id DESC
    `,
    [userId],
  );

  return result.rows.reduce((acc: WedgeMatrix[], row: any) => {
    const id = Number(row.id);
    if (!Number.isFinite(id)) {
      return acc;
    }
    acc.push({
      id: Math.floor(id),
      name: String(row.name || ''),
      groupName: String(row.group_name || ''),
      sortOrder: Number.isFinite(Number(row.sort_order)) ? Math.floor(Number(row.sort_order)) : 0,
      stanceWidth: String(row.stance_width || ''),
      grip: String(row.grip || ''),
      ballPosition: String(row.ball_position || ''),
      notes: String(row.notes || ''),
      currentRoundAdjustments: String(row.current_round_adjustments || ''),
      clubs: sanitizeClubList(row.clubs),
      swingClocks: resolveSwingClockList(row.swing_clocks),
      calculationMode: sanitizeCalculationMode(row.calculation_mode),
      setValues: sanitizeSetValues(row.set_values),
      createdAt: String(row.created_at || ''),
    });
    return acc;
  }, []);
};

export const insertWedgeMatrix = async ({
  userId,
  name,
  groupName,
  sortOrder,
  stanceWidth,
  grip,
  ballPosition,
  notes,
  currentRoundAdjustments,
  clubs,
  swingClocks,
  calculationMode,
  setValues,
}: {
  userId: string;
  name: string;
  groupName: string;
  sortOrder: number;
  stanceWidth: string;
  grip: string;
  ballPosition: string;
  notes: string;
  currentRoundAdjustments: string;
  clubs: ClubOption[];
  swingClocks: string[];
  calculationMode: 'entries' | 'setValues';
  setValues: Record<string, Record<string, number>>;
}) => {
  const safeName = sanitizeTextField(name, 80) || 'Wedge matrix';
  const safeGroupName = sanitizeTextField(groupName, 80);
  const safeSortOrder = Number.isFinite(sortOrder) ? Math.max(0, Math.floor(sortOrder)) : 0;
  const safeStanceWidth = sanitizeTextField(stanceWidth, 120);
  const safeGrip = sanitizeTextField(grip, 120);
  const safeBallPosition = sanitizeTextField(ballPosition, 120);
  const safeNotes = sanitizeTextField(notes, 400);
  const safeCurrentRoundAdjustments = sanitizeTextField(currentRoundAdjustments, 600);
  const safeClubs = sanitizeClubList(clubs);
  const resolvedSwingClocks = resolveSwingClockList(swingClocks);
  const safeCalculationMode = sanitizeCalculationMode(calculationMode);
  const safeSetValues = sanitizeSetValues(setValues);

  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO wedge_matrices (
        user_id, name, group_name, sort_order, stance_width, grip, ball_position, notes, current_round_adjustments, clubs, swing_clocks, calculation_mode, set_values, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13::jsonb, $14::timestamptz)
      RETURNING id, name, group_name, sort_order, stance_width, grip, ball_position, notes, current_round_adjustments, clubs, swing_clocks, calculation_mode, set_values, created_at
    `,
    [
      userId,
      safeName,
      safeGroupName,
      safeSortOrder,
      safeStanceWidth,
      safeGrip,
      safeBallPosition,
      safeNotes,
      safeCurrentRoundAdjustments,
      JSON.stringify(safeClubs),
      JSON.stringify(resolvedSwingClocks),
      safeCalculationMode,
      JSON.stringify(safeSetValues),
      new Date().toISOString(),
    ],
  );

  const row = result.rows[0] || {};
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    groupName: String(row.group_name || ''),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Math.floor(Number(row.sort_order)) : 0,
    stanceWidth: String(row.stance_width || ''),
    grip: String(row.grip || ''),
    ballPosition: String(row.ball_position || ''),
    notes: String(row.notes || ''),
    currentRoundAdjustments: String(row.current_round_adjustments || ''),
    clubs: sanitizeClubList(row.clubs),
    swingClocks: resolveSwingClockList(row.swing_clocks),
    calculationMode: sanitizeCalculationMode(row.calculation_mode),
    setValues: sanitizeSetValues(row.set_values),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeMatrix;
};

export const updateWedgeMatrix = async ({
  id,
  userId,
  name,
  groupName,
  sortOrder,
  stanceWidth,
  grip,
  ballPosition,
  notes,
  currentRoundAdjustments,
  clubs,
  swingClocks,
  calculationMode,
  setValues,
}: {
  id: number;
  userId: string;
  name: string;
  groupName: string;
  sortOrder: number;
  stanceWidth: string;
  grip: string;
  ballPosition: string;
  notes: string;
  currentRoundAdjustments: string;
  clubs: ClubOption[];
  swingClocks: string[];
  calculationMode: 'entries' | 'setValues';
  setValues: Record<string, Record<string, number>>;
}) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const safeName = sanitizeTextField(name, 80) || 'Wedge matrix';
  const safeGroupName = sanitizeTextField(groupName, 80);
  const safeSortOrder = Number.isFinite(sortOrder) ? Math.max(0, Math.floor(sortOrder)) : 0;
  const safeStanceWidth = sanitizeTextField(stanceWidth, 120);
  const safeGrip = sanitizeTextField(grip, 120);
  const safeBallPosition = sanitizeTextField(ballPosition, 120);
  const safeNotes = sanitizeTextField(notes, 400);
  const safeCurrentRoundAdjustments = sanitizeTextField(currentRoundAdjustments, 600);
  const safeClubs = sanitizeClubList(clubs);
  const resolvedSwingClocks = resolveSwingClockList(swingClocks);
  const safeCalculationMode = sanitizeCalculationMode(calculationMode);
  const safeSetValues = sanitizeSetValues(setValues);

  const db = getPool();
  const result = await db.query(
    `
      UPDATE wedge_matrices
      SET name = $1,
          group_name = $2,
          sort_order = $3,
          stance_width = $4,
          grip = $5,
          ball_position = $6,
          notes = $7,
          current_round_adjustments = $8,
          clubs = $9::jsonb,
          swing_clocks = $10::jsonb,
          calculation_mode = $11,
          set_values = $12::jsonb
      WHERE id = $13 AND user_id = $14
      RETURNING id, name, group_name, sort_order, stance_width, grip, ball_position, notes, current_round_adjustments, clubs, swing_clocks, calculation_mode, set_values, created_at
    `,
    [
      safeName,
      safeGroupName,
      safeSortOrder,
      safeStanceWidth,
      safeGrip,
      safeBallPosition,
      safeNotes,
      safeCurrentRoundAdjustments,
      JSON.stringify(safeClubs),
      JSON.stringify(resolvedSwingClocks),
      safeCalculationMode,
      JSON.stringify(safeSetValues),
      id,
      userId,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: String(row.name || ''),
    groupName: String(row.group_name || ''),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Math.floor(Number(row.sort_order)) : 0,
    stanceWidth: String(row.stance_width || ''),
    grip: String(row.grip || ''),
    ballPosition: String(row.ball_position || ''),
    notes: String(row.notes || ''),
    currentRoundAdjustments: String(row.current_round_adjustments || ''),
    clubs: sanitizeClubList(row.clubs),
    swingClocks: resolveSwingClockList(row.swing_clocks),
    calculationMode: sanitizeCalculationMode(row.calculation_mode),
    setValues: sanitizeSetValues(row.set_values),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeMatrix;
};

export const deleteWedgeMatrix = async (id: number, userId: string) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const db = getPool();
  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM wedge_entries WHERE matrix_id = $1 AND user_id = $2', [id, userId]);
    const result = await db.query('DELETE FROM wedge_matrices WHERE id = $1 AND user_id = $2', [id, userId]);
    await db.query('COMMIT');
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

export const listWedgeEntries = async (userId: string, matrixId?: number | null) => {
  const db = getPool();
  const params: Array<number | string> = [userId];
  let filterClause = 'WHERE user_id = $1';
  if (Number.isFinite(matrixId)) {
    filterClause += ' AND matrix_id = $2';
    params.push(Number(matrixId));
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
    const club = normalizeClubLabel(row.club);
    const swingClock = sanitizeSwingClockLabel(row.swing_clock);
    const distanceMeters = Number(row.distance_meters);
    const createdAt = String(row.created_at || '');
    const id = Number(row.id);
    const matrixId = Number(row.matrix_id);
    if (!isClubOption(club) || !swingClock) {
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
  userId,
  matrixId,
  club,
  swingClock,
  distanceMeters,
}: {
  userId: string;
  matrixId: number;
  club: string;
  swingClock: string;
  distanceMeters: unknown;
}) => {
  if (!Number.isFinite(matrixId) || matrixId <= 0) {
    throw new Error('Invalid matrix');
  }

  const normalizedClub = normalizeClubLabel(club);
  if (!isClubOption(normalizedClub)) {
    throw new Error('Invalid club');
  }
  const safeSwingClock = sanitizeSwingClockLabel(swingClock);
  if (!safeSwingClock) {
    throw new Error('Invalid swing clock');
  }

  const matrixResult = await getPool().query('SELECT swing_clocks FROM wedge_matrices WHERE id = $1 AND user_id = $2', [matrixId, userId]);
  const matrixRow = matrixResult.rows[0];
  if (!matrixRow) {
    throw new Error('Invalid matrix');
  }
  const allowedSwingClocks = resolveSwingClockList(matrixRow.swing_clocks);
  if (!allowedSwingClocks.includes(safeSwingClock)) {
    throw new Error('Invalid swing clock');
  }

  const sanitizedDistance = sanitizeWedgeDistanceMeters(distanceMeters);
  if (sanitizedDistance === null) {
    throw new Error('Invalid distance');
  }

  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO wedge_entries (user_id, matrix_id, club, swing_clock, distance_meters, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      RETURNING id, matrix_id, club, swing_clock, distance_meters, created_at
    `,
    [userId, matrixId, normalizedClub, safeSwingClock, sanitizedDistance, new Date().toISOString()],
  );

  const row = result.rows[0] || {};
  const savedClub = normalizeClubLabel(row.club) as ClubOption;
  const savedSwingClock = sanitizeSwingClockLabel(row.swing_clock);
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
  userId,
  matrixId,
  club,
  swingClock,
  distanceMeters,
}: {
  id: number;
  userId: string;
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

  const normalizedClub = normalizeClubLabel(club);
  if (!isClubOption(normalizedClub)) {
    throw new Error('Invalid club');
  }
  const safeSwingClock = sanitizeSwingClockLabel(swingClock);
  if (!safeSwingClock) {
    throw new Error('Invalid swing clock');
  }

  const matrixResult = await getPool().query('SELECT swing_clocks FROM wedge_matrices WHERE id = $1 AND user_id = $2', [matrixId, userId]);
  const matrixRow = matrixResult.rows[0];
  if (!matrixRow) {
    throw new Error('Invalid matrix');
  }
  const allowedSwingClocks = resolveSwingClockList(matrixRow.swing_clocks);
  if (!allowedSwingClocks.includes(safeSwingClock)) {
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
      WHERE id = $5 AND user_id = $6
      RETURNING id, matrix_id, club, swing_clock, distance_meters, created_at
    `,
    [matrixId, normalizedClub, safeSwingClock, sanitizedDistance, id, userId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    matrixId: Number(row.matrix_id),
    club: normalizeClubLabel(row.club) as ClubOption,
    swingClock: sanitizeSwingClockLabel(row.swing_clock),
    distanceMeters: Number(row.distance_meters),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeEntry;
};

export const deleteWedgeEntry = async (id: number, userId: string) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const db = getPool();
  const result = await db.query('DELETE FROM wedge_entries WHERE id = $1 AND user_id = $2', [id, userId]);
  return (result.rowCount ?? 0) > 0;
};
