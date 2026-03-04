import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

const defaultDataFile = process.env.VERCEL
  ? '/tmp/golf-stats.json'
  : path.join(process.cwd(), 'data', 'stats.json');

const DATA_FILE = process.env.DATA_FILE || defaultDataFile;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

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

const sanitizeDataStore = (raw) => {
  if (raw && Array.isArray(raw.rounds)) {
    const rounds = raw.rounds
      .filter((round) => round && typeof round === 'object' && round.id)
      .map((round, index) => {
        const now = new Date().toISOString();
        return {
          id: String(round.id),
          name: sanitizeRoundName(round.name, index + 1),
          statsByHole: sanitizeStats(round.statsByHole),
          notes: sanitizeRoundNotes(round.notes),
          createdAt: round.createdAt || now,
          updatedAt: round.updatedAt || now,
        };
      });

    if (rounds.length > 0) {
      return { rounds };
    }
  }

  const legacyStats = raw?.statsByHole ?? raw;
  return {
    rounds: [createRound('Round 1', legacyStats)],
  };
};

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

let store = null;
let loadPromise = null;

const loadPersistedStore = async () => {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeDataStore(parsed);
  } catch {
    return { rounds: [createRound('Round 1', buildInitialByHole())] };
  }
};

const ensureStore = async () => {
  if (store) {
    return store;
  }

  if (!loadPromise) {
    loadPromise = loadPersistedStore().then((loaded) => {
      store = loaded;
      return store;
    });
  }

  return loadPromise;
};

const persistStore = async () => {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      DATA_FILE,
      JSON.stringify(
        {
          schemaVersion: 2,
          rounds: store.rounds,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    return true;
  } catch {
    return false;
  }
};

const getRoundById = (roundId) => store.rounds.find((round) => round.id === roundId);

export const handleRequest = async (req, res) => {
  await ensureStore();

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

  if (pathname === '/api/rounds' && method === 'GET') {
    sendJson(res, 200, { rounds: store.rounds.map(toRoundSummary) });
    return;
  }

  if (pathname === '/api/rounds' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const roundName = sanitizeRoundName(body?.name, store.rounds.length + 1);
      const newRound = createRound(
        roundName,
        body?.statsByHole ?? buildInitialByHole(),
        body?.notes ?? '',
      );
      store = { rounds: [newRound, ...store.rounds] };
      await persistStore();
      sendJson(res, 201, { round: newRound });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
    }
    return;
  }

  const roundMatch = pathname.match(/^\/api\/rounds\/([^/]+)$/);
  if (roundMatch) {
    const roundId = decodeURIComponent(roundMatch[1]);
    const round = getRoundById(roundId);

    if (!round) {
      sendJson(res, 404, { ok: false, error: 'Round not found' });
      return;
    }

    if (method === 'GET') {
      sendJson(res, 200, { round });
      return;
    }

    if (method === 'PUT') {
      try {
        const body = await parseBody(req);

        round.name = sanitizeRoundName(body?.name ?? round.name);
        round.statsByHole = sanitizeStats(body?.statsByHole ?? round.statsByHole);
        round.notes = sanitizeRoundNotes(body?.notes ?? round.notes);
        round.updatedAt = new Date().toISOString();

        await persistStore();
        sendJson(res, 200, { ok: true, round });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
};
