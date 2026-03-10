import { sanitizeWedgeDistanceMeters } from '../domain/sanitize.js';
import { isSwingClockOption, isWedgeOption } from '../domain/guards.js';
import type { SwingClockOption, WedgeEntry, WedgeOption } from '../domain/types.js';
import { getPool } from './pool.js';

export const listWedgeEntries = async () => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT id,
             club,
             swing_clock,
             distance_meters,
             created_at
      FROM wedge_entries
      ORDER BY created_at DESC, id DESC
      LIMIT 500
    `,
  );

  return result.rows.reduce((acc: WedgeEntry[], row: any) => {
    const club = String(row.club || '');
    const swingClock = String(row.swing_clock || '');
    const distanceMeters = Number(row.distance_meters);
    const createdAt = String(row.created_at || '');
    const id = Number(row.id);
    if (!isWedgeOption(club) || !isSwingClockOption(swingClock)) {
      return acc;
    }
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return acc;
    }
    if (!Number.isFinite(id)) {
      return acc;
    }

    acc.push({
      id: Math.floor(id),
      club,
      swingClock,
      distanceMeters: Math.round(distanceMeters),
      createdAt,
    });
    return acc;
  }, []);
};

export const insertWedgeEntry = async ({
  club,
  swingClock,
  distanceMeters,
}: {
  club: string;
  swingClock: string;
  distanceMeters: unknown;
}) => {
  if (!isWedgeOption(club)) {
    throw new Error('Invalid wedge');
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
      INSERT INTO wedge_entries (club, swing_clock, distance_meters, created_at)
      VALUES ($1, $2, $3, $4::timestamptz)
      RETURNING id, club, swing_clock, distance_meters, created_at
    `,
    [club, swingClock, sanitizedDistance, new Date().toISOString()],
  );

  const row = result.rows[0] || {};
  const savedClub = String(row.club || '') as WedgeOption;
  const savedSwingClock = String(row.swing_clock || '') as SwingClockOption;
  return {
    id: Number(row.id),
    club: savedClub,
    swingClock: savedSwingClock,
    distanceMeters: Number(row.distance_meters),
    createdAt: String(row.created_at || ''),
  } satisfies WedgeEntry;
};

export const updateWedgeEntry = async ({
  id,
  club,
  swingClock,
  distanceMeters,
}: {
  id: number;
  club: string;
  swingClock: string;
  distanceMeters: unknown;
}) => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  if (!isWedgeOption(club)) {
    throw new Error('Invalid wedge');
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
      SET club = $1,
          swing_clock = $2,
          distance_meters = $3
      WHERE id = $4
      RETURNING id, club, swing_clock, distance_meters, created_at
    `,
    [club, swingClock, sanitizedDistance, id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    club: String(row.club || '') as WedgeOption,
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
  return result.rowCount > 0;
};
