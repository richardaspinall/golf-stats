import { Pool } from 'pg';
import { DATABASE_URL, DB_CONFIGURED } from '../config/env.js';

let pool: Pool | null = null;

export const getPool = () => {
  if (!DB_CONFIGURED) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!pool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
};
