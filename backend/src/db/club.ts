import { sanitizeActualMeters, sanitizeCarryMeters, sanitizeClubCarryPayload } from '../domain/sanitize.js';
import { isClubOption } from '../domain/guards.js';
import type { ClubActualEntry, ClubAveragesByClub, ClubCarryByClub } from '../domain/types.js';
import { getPool } from './pool.js';

type VirtualCaddyClubActualShot = {
  shotId: number;
  club: string;
  actualMeters: number;
};

export type VirtualCaddyClubActualSyncEntry = {
  id: number;
  shotId: number;
  club: string;
  actualMeters: number;
  createdAt: string;
};

export const listClubCarry = async (userId: string) => {
  const db = getPool();
  const result = await db.query('SELECT club, carry_meters FROM club_carry WHERE user_id = $1 ORDER BY updated_at DESC, club ASC', [userId]);

  return result.rows.reduce((acc: ClubCarryByClub, row: any) => {
    const club = String(row.club);
    if (isClubOption(club)) {
      const sanitizedCarry = sanitizeCarryMeters(row.carry_meters);
      if (sanitizedCarry !== null) {
        acc[club] = sanitizedCarry;
      }
    }
    return acc;
  }, {} as ClubCarryByClub);
};

export const saveClubCarry = async (userId: string, carryByClub: unknown) => {
  const db = getPool();
  const entries = Object.entries(sanitizeClubCarryPayload(carryByClub));
  const now = new Date().toISOString();
  const clubs = entries.map(([club]) => club);

  await db.query('BEGIN');
  try {
    if (clubs.length > 0) {
      await db.query(
        `
          DELETE FROM club_carry
          WHERE user_id = $1
            AND club <> ALL($2::text[])
        `,
        [userId, clubs],
      );
    } else {
      await db.query('DELETE FROM club_carry WHERE user_id = $1', [userId]);
    }

    for (const [club, carryMeters] of entries) {
      await db.query(
        `
          INSERT INTO club_carry (user_id, club, carry_meters, updated_at)
          VALUES ($1, $2, $3, $4::timestamptz)
          ON CONFLICT (user_id, club)
          DO UPDATE SET carry_meters = EXCLUDED.carry_meters,
                        updated_at = EXCLUDED.updated_at
        `,
        [userId, club, carryMeters, now],
      );
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }

  return listClubCarry(userId);
};

export const insertClubActualDistance = async ({
  userId,
  club,
  actualMeters,
}: {
  userId: string;
  club: string;
  actualMeters: unknown;
}) => {
  if (!isClubOption(club)) {
    throw new Error('Invalid club');
  }

  const sanitizedActual = sanitizeActualMeters(actualMeters);
  if (sanitizedActual === null) {
    throw new Error('Invalid actual distance');
  }

  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO club_actual_distances (user_id, club, actual_meters, created_at)
      VALUES ($1, $2, $3, $4::timestamptz)
      RETURNING id, club, actual_meters, created_at
    `,
    [userId, club, sanitizedActual, new Date().toISOString()],
  );

  const row = result.rows[0];
  return {
    id: Number(row.id),
    club,
    actualMeters: sanitizedActual,
    createdAt: new Date(row.created_at).toISOString(),
  };
};

export const listClubActualAverages = async (userId: string) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT club,
             COUNT(*)::int AS shots,
             ROUND(AVG(actual_meters))::int AS avg_meters
      FROM club_actual_distances
      WHERE user_id = $1
      GROUP BY club
    `,
    [userId],
  );

  return result.rows.reduce((acc: ClubAveragesByClub, row: any) => {
    const club = String(row.club || '');
    if (!isClubOption(club)) {
      return acc;
    }

    const shots = Number(row.shots);
    const avgMeters = Number(row.avg_meters);
    if (!Number.isFinite(shots) || shots <= 0 || !Number.isFinite(avgMeters) || avgMeters <= 0) {
      return acc;
    }

    acc[club] = {
      shots: Math.floor(shots),
      avgMeters: Math.floor(avgMeters),
    };
    return acc;
  }, {} as ClubAveragesByClub);
};

export const listClubActualEntries = async (userId: string) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT id, club, actual_meters, created_at
      FROM club_actual_distances
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [userId],
  );

  return result.rows.reduce((acc: ClubActualEntry[], row: any) => {
    const club = String(row.club || '');
    if (!isClubOption(club)) {
      return acc;
    }
    const actualMeters = Number(row.actual_meters);
    if (!Number.isFinite(actualMeters) || actualMeters <= 0) {
      return acc;
    }
    acc.push({
      id: Number(row.id),
      club,
      actualMeters: Math.floor(actualMeters),
      createdAt: new Date(row.created_at).toISOString(),
    });
    return acc;
  }, []);
};

export const deleteClubActualEntry = async (entryId: number, userId: string) => {
  const db = getPool();
  const result = await db.query('DELETE FROM club_actual_distances WHERE id = $1 AND user_id = $2 RETURNING id', [entryId, userId]);
  return result.rows.length > 0;
};

export const replaceVirtualCaddyClubActuals = async ({
  userId,
  roundId,
  hole,
  shots,
}: {
  userId: string;
  roundId: string;
  hole: unknown;
  shots: Array<{ shotId: unknown; club: string; actualMeters: unknown }>;
}): Promise<VirtualCaddyClubActualSyncEntry[]> => {
  const sanitizedRoundId = String(roundId || '').trim();
  const sanitizedHole = Math.floor(Number(hole));

  if (!sanitizedRoundId) {
    throw new Error('Invalid round id');
  }
  if (!Number.isFinite(sanitizedHole) || sanitizedHole < 1 || sanitizedHole > 18) {
    throw new Error('Invalid hole');
  }

  const sanitizedShots = shots.reduce((acc: VirtualCaddyClubActualShot[], shot) => {
    const shotId = Math.floor(Number(shot?.shotId));
    if (!Number.isFinite(shotId) || shotId <= 0) {
      throw new Error('Invalid shot id');
    }
    if (!isClubOption(shot.club)) {
      throw new Error('Invalid club');
    }

    const actualMeters = sanitizeActualMeters(shot.actualMeters);
    if (actualMeters === null) {
      throw new Error('Invalid actual distance');
    }

    acc.push({
      shotId,
      club: shot.club,
      actualMeters,
    });
    return acc;
  }, []);

  const db = getPool();
  const now = new Date().toISOString();
  await db.query('BEGIN');

  try {
    await db.query(
      `
        DELETE FROM club_actual_distances
        WHERE user_id = $1
          AND source_kind = 'virtualCaddy'
          AND source_round_id = $2
          AND source_hole = $3
      `,
      [userId, sanitizedRoundId, sanitizedHole],
    );

    const inserted: VirtualCaddyClubActualSyncEntry[] = [];
    for (const shot of sanitizedShots) {
      const result = await db.query(
        `
          INSERT INTO club_actual_distances (
            user_id,
            club,
            actual_meters,
            created_at,
            source_kind,
            source_round_id,
            source_hole,
            source_shot_id
          )
          VALUES ($1, $2, $3, $4::timestamptz, 'virtualCaddy', $5, $6, $7)
          RETURNING id, club, actual_meters, created_at, source_shot_id
        `,
        [userId, shot.club, shot.actualMeters, now, sanitizedRoundId, sanitizedHole, shot.shotId],
      );

      const row = result.rows[0];
      inserted.push({
        id: Number(row.id),
        shotId: Number(row.source_shot_id),
        club: String(row.club),
        actualMeters: Number(row.actual_meters),
        createdAt: new Date(row.created_at).toISOString(),
      });
    }

    await db.query('COMMIT');
    return inserted;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};
