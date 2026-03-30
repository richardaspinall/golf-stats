import { sanitizeActualMeters, sanitizeCarryMeters, sanitizeClubCarryPayload } from '../domain/sanitize.js';
import { isClubOption } from '../domain/guards.js';
import type { ClubActualEntry, ClubAveragesByClub, ClubCarryByClub } from '../domain/types.js';
import { getPool } from './pool.js';

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
