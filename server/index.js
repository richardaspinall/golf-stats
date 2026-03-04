import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3001);
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'stats.json');

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
    rounds: [
      createRound('Round 1', legacyStats),
    ],
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
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const loadPersistedStore = async () => {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeDataStore(parsed);
  } catch {
    return { rounds: [createRound('Round 1', buildInitialByHole())] };
  }
};

let store = await loadPersistedStore();

const persistStore = async () => {
  await mkdir(DATA_DIR, { recursive: true });
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
};

const getRoundById = (roundId) => store.rounds.find((round) => round.id === roundId);

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/rounds' && req.method === 'GET') {
    sendJson(res, 200, { rounds: store.rounds.map(toRoundSummary) });
    return;
  }

  if (pathname === '/api/rounds' && req.method === 'POST') {
    try {
      const bodyRaw = await readBody(req);
      const body = bodyRaw ? JSON.parse(bodyRaw) : {};
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

    if (req.method === 'GET') {
      sendJson(res, 200, { round });
      return;
    }

    if (req.method === 'PUT') {
      try {
        const bodyRaw = await readBody(req);
        const body = bodyRaw ? JSON.parse(bodyRaw) : {};

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
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
