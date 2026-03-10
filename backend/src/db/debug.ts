import { DB_CONFIGURED } from '../config/env.js';
import { getPool } from './pool.js';
import { toIso } from './utils.js';

export const getDbDebugStatus = async () => {
  if (!DB_CONFIGURED) {
    return {
      ok: false,
      configured: false,
      message: 'DATABASE_URL is not configured',
    };
  }

  try {
    const db = getPool();
    const result = await db.query('SELECT NOW() AS now');
    return {
      ok: true,
      configured: true,
      message: 'Database connection successful',
      now: toIso(result.rows?.[0]?.now),
    };
  } catch (error: any) {
    return {
      ok: false,
      configured: true,
      message: 'Database connection failed',
      detail: error?.message || 'Unknown database error',
    };
  }
};
