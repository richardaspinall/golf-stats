import crypto from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
loadEnv({ path: path.join(backendRoot, '.env') });
loadEnv({ path: path.join(backendRoot, '.env.local'), override: true });

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

const COUNTER_OPTIONS = [
  'inside100Over3',
  'inside100Bunkers',
  'inside100Wedges',
  'inside100ChipShots',
  'oopLook',
  'oopNoLook',
];

const FAIRWAY_KEYS = ['fairwayHit', 'fairwayLeft', 'fairwayRight'];
const GIR_KEYS = ['girHit', 'girLeft', 'girRight', 'girLong', 'girShort'];
const VALID_FAIRWAY_KEYS = new Set(FAIRWAY_KEYS);
const VALID_GIR_KEYS = new Set(GIR_KEYS);

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const AUTH_USERNAME = String(process.env.AUTH_USERNAME || '').trim();
const AUTH_PASSWORD = String(process.env.AUTH_PASSWORD || '');
const JWT_SECRET = String(process.env.JWT_SECRET || '');
const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24 * 7);

const normalizeOrigin = (rawValue) => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed || trimmed === '*') {
    return '*';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/\/$/, '')}`;
};

const CORS_ORIGIN = normalizeOrigin(process.env.CORS_ORIGIN || '*');
const AUTH_CONFIGURED = Boolean(AUTH_USERNAME && AUTH_PASSWORD && JWT_SECRET);
const DB_CONFIGURED = Boolean(DATABASE_URL);

let pool = null;
let schemaReadyPromise = null;

const getPool = () => {
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

const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    const client = getPool();
    schemaReadyPromise = client.query(`
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        stats_by_hole JSONB NOT NULL,
        notes JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `);
  }

  await schemaReadyPromise;
};

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const safeCompare = (a, b) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

const signToken = (subject) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: subject,
    iat: now,
    exp: now + Math.max(60, Math.floor(JWT_TTL_SECONDS)),
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${signingInput}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { ok: false, error: 'Malformed token' };
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signingInput)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (!safeCompare(encodedSignature, expectedSignature)) {
      return { ok: false, error: 'Invalid token signature' };
    }

    const payload = JSON.parse(fromBase64Url(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.sub || payload.sub !== AUTH_USERNAME) {
      return { ok: false, error: 'Invalid subject' };
    }

    if (!payload?.exp || now >= payload.exp) {
      return { ok: false, error: 'Token expired' };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'Invalid token' };
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!value || !value.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
};

const emptyHoleStats = () =>
  COUNTER_OPTIONS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, { fairwaySelection: null, girSelection: null });

const buildInitialByHole = () =>
  HOLES.reduce((acc, hole) => {
    acc[hole] = emptyHoleStats();
    return acc;
  }, {});

const sanitizeStats = (raw) => {
  const safe = buildInitialByHole();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const holeRaw = raw[hole];
    if (!holeRaw || typeof holeRaw !== 'object') {
      return;
    }

    COUNTER_OPTIONS.forEach((key) => {
      const value = Number(holeRaw[key]);
      safe[hole][key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    safe[hole].fairwaySelection = VALID_FAIRWAY_KEYS.has(holeRaw.fairwaySelection)
      ? holeRaw.fairwaySelection
      : null;
    safe[hole].girSelection = VALID_GIR_KEYS.has(holeRaw.girSelection) ? holeRaw.girSelection : null;
  });

  return safe;
};

const sanitizeRoundName = (raw, fallbackIndex = 1) => {
  const value = String(raw || '').trim();
  return value ? value.slice(0, 80) : `Round ${fallbackIndex}`;
};

const sanitizeRoundNotes = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .map((note) => String(note || '').trim().slice(0, 1000))
      .filter(Boolean)
      .slice(0, 300);
  }

  const legacy = String(raw || '').trim();
  return legacy ? [legacy.slice(0, 1000)] : [];
};

const createRound = (name, statsByHole, notes = '') => {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    statsByHole: sanitizeStats(statsByHole),
    notes: sanitizeRoundNotes(notes),
    createdAt: now,
    updatedAt: now,
  };
};

const toRoundSummary = (round) => ({
  id: round.id,
  name: round.name,
  createdAt: round.createdAt,
  updatedAt: round.updatedAt,
});

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : {};
    }

    if (req.body && typeof req.body === 'object') {
      return req.body;
    }

    return {};
  }

  const bodyRaw = await readBody(req);
  return bodyRaw ? JSON.parse(bodyRaw) : {};
};

const getUrl = (req) => {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `http://${host}`);
};

const toIso = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? new Date().toISOString() : parsed.toISOString();
};

const mapDbRound = (row) => ({
  id: String(row.id),
  name: sanitizeRoundName(row.name),
  statsByHole: sanitizeStats(row.stats_by_hole),
  notes: sanitizeRoundNotes(row.notes),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const listRounds = async () => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, created_at, updated_at FROM rounds ORDER BY updated_at DESC, created_at DESC',
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: sanitizeRoundName(row.name),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
};

const getRoundById = async (roundId) => {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, stats_by_hole, notes, created_at, updated_at FROM rounds WHERE id = $1 LIMIT 1',
    [roundId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDbRound(result.rows[0]);
};

const insertRound = async (round) => {
  const db = getPool();
  const result = await db.query(
    `
      INSERT INTO rounds (id, name, stats_by_hole, notes, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::timestamptz, $6::timestamptz)
      RETURNING id, name, stats_by_hole, notes, created_at, updated_at
    `,
    [
      round.id,
      round.name,
      JSON.stringify(round.statsByHole),
      JSON.stringify(round.notes),
      round.createdAt,
      round.updatedAt,
    ],
  );

  return mapDbRound(result.rows[0]);
};

const updateRound = async (roundId, updates) => {
  const db = getPool();
  const result = await db.query(
    `
      UPDATE rounds
      SET name = $2,
          stats_by_hole = $3::jsonb,
          notes = $4::jsonb,
          updated_at = $5::timestamptz
      WHERE id = $1
      RETURNING id, name, stats_by_hole, notes, created_at, updated_at
    `,
    [
      roundId,
      updates.name,
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

const getDbDebugStatus = async () => {
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
  } catch (error) {
    return {
      ok: false,
      configured: true,
      message: 'Database connection failed',
      detail: error?.message || 'Unknown database error',
    };
  }
};

export const handleRequest = async (req, res) => {
  try {
    const requestUrl = getUrl(req);
    const pathname = requestUrl.pathname;
    const method = req.method || 'GET';

    if (method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      if (!AUTH_CONFIGURED) {
        sendJson(res, 500, { ok: false, error: 'Auth is not configured on the server' });
        return;
      }

      try {
        const body = await parseBody(req);
        const username = String(body?.username || '').trim();
        const password = String(body?.password || '');

        if (!safeCompare(username, AUTH_USERNAME) || !safeCompare(password, AUTH_PASSWORD)) {
          sendJson(res, 401, { ok: false, error: 'Invalid credentials' });
          return;
        }

        const token = signToken(AUTH_USERNAME);
        sendJson(res, 200, { ok: true, token, expiresIn: Math.max(60, Math.floor(JWT_TTL_SECONDS)) });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    if (pathname.startsWith('/api/') && pathname !== '/api/health') {
      if (!AUTH_CONFIGURED) {
        sendJson(res, 500, { ok: false, error: 'Auth is not configured on the server' });
        return;
      }

      const token = getBearerToken(req);
      const tokenState = verifyToken(token);
      if (!tokenState.ok) {
        sendJson(res, 401, { ok: false, error: 'Unauthorized' });
        return;
      }
    }

    if (pathname === '/api/debug/db' && method === 'GET') {
      const debug = await getDbDebugStatus();
      sendJson(res, debug.ok ? 200 : 500, debug);
      return;
    }

    if (pathname === '/api/rounds' || pathname.startsWith('/api/rounds/')) {
      await ensureSchema();
    }

    if (pathname === '/api/rounds' && method === 'GET') {
      sendJson(res, 200, { rounds: await listRounds() });
      return;
    }

    if (pathname === '/api/rounds' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const existingRounds = await listRounds();
        const roundName = sanitizeRoundName(body?.name, existingRounds.length + 1);
        const newRound = createRound(
          roundName,
          body?.statsByHole ?? buildInitialByHole(),
          body?.notes ?? '',
        );
        const inserted = await insertRound(newRound);
        sendJson(res, 201, { round: inserted });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    const roundMatch = pathname.match(/^\/api\/rounds\/([^/]+)$/);
    if (roundMatch) {
      const roundId = decodeURIComponent(roundMatch[1]);

      if (method === 'GET') {
        const round = await getRoundById(roundId);
        if (!round) {
          sendJson(res, 404, { ok: false, error: 'Round not found' });
          return;
        }

        sendJson(res, 200, { round });
        return;
      }

      if (method === 'PUT') {
        try {
          const current = await getRoundById(roundId);
          if (!current) {
            sendJson(res, 404, { ok: false, error: 'Round not found' });
            return;
          }

          const body = await parseBody(req);
          const updated = await updateRound(roundId, {
            name: sanitizeRoundName(body?.name ?? current.name),
            statsByHole: sanitizeStats(body?.statsByHole ?? current.statsByHole),
            notes: sanitizeRoundNotes(body?.notes ?? current.notes),
            updatedAt: new Date().toISOString(),
          });

          sendJson(res, 200, { ok: true, round: updated });
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    if (!res.headersSent) {
      const isMisconfigured = !DB_CONFIGURED && String(error?.message || '').includes('DATABASE_URL');
      sendJson(res, isMisconfigured ? 500 : 500, {
        ok: false,
        error: isMisconfigured ? 'DATABASE_URL is not configured' : 'Internal server error',
        detail: error?.message || 'Unknown error',
      });
      return;
    }
  }
};
