import { describe, expect, it, vi } from 'vitest';

const createMockRes = () => {
  const headers: Record<string, string> = {};
  let body = '';
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    end: (value?: string) => {
      if (value) {
        body = value;
      }
      res.headersSent = true;
    },
  } as any;
  return { res, headers, getBody: () => body };
};

const createMockReq = (init: { method?: string; url?: string; headers?: Record<string, string>; body?: any }) => ({
  method: init.method ?? 'GET',
  url: init.url ?? '/',
  headers: init.headers ?? {},
  body: init.body,
});

const loadHandler = async (envOverrides?: Partial<Record<string, string | number | boolean>>) => {
  vi.resetModules();

  vi.doMock('../src/config/env.js', () => {
    const AUTH_USERNAME = 'demo';
    const AUTH_PASSWORD = 'secret';
    const JWT_SECRET = 'jwtsecret';
    const JWT_TTL_SECONDS = 60 * 60;
    const CORS_ORIGIN = 'http://test-origin';
    const DATABASE_URL = 'postgres://example';

    const overrides = envOverrides ?? {};

    return {
      AUTH_USERNAME: (overrides.AUTH_USERNAME as string) ?? AUTH_USERNAME,
      AUTH_PASSWORD: (overrides.AUTH_PASSWORD as string) ?? AUTH_PASSWORD,
      JWT_SECRET: (overrides.JWT_SECRET as string) ?? JWT_SECRET,
      JWT_TTL_SECONDS: (overrides.JWT_TTL_SECONDS as number) ?? JWT_TTL_SECONDS,
      CORS_ORIGIN: (overrides.CORS_ORIGIN as string) ?? CORS_ORIGIN,
      DATABASE_URL: (overrides.DATABASE_URL as string) ?? DATABASE_URL,
      GOOGLE_CLIENT_ID: (overrides.GOOGLE_CLIENT_ID as string) ?? 'google-client-id',
      AUTH_CONFIGURED: true,
      DB_CONFIGURED: true,
      LEGACY_BOOTSTRAP_AUTH: true,
      GOOGLE_AUTH_CONFIGURED: true,
    };
  });

  vi.doMock('../src/auth/google.js', () => ({
    verifyGoogleIdToken: vi.fn().mockResolvedValue({
      googleSub: 'google-sub-1',
      email: 'demo@example.com',
      displayName: 'Demo Google',
    }),
  }));

  vi.doMock('../src/db/schema.js', () => ({
    ensureSchema: vi.fn().mockResolvedValue(undefined),
  }));
  const updateRound = vi.fn().mockResolvedValue({
    id: '1',
    userId: 'user-1',
    name: 'Round 1',
    roundDate: '2026-04-09',
    handicap: 8,
    courseId: 'course-1',
    statsByHole: {},
    notes: ['Hit driver well'],
    createdAt: 'now',
    updatedAt: 'later',
  });
  const deleteRoundById = vi.fn();
  vi.doMock('../src/db/rounds.js', () => ({
    listRounds: vi.fn().mockResolvedValue([{ id: '1', name: 'Round 1', courseId: null, createdAt: 'now', updatedAt: 'now' }]),
    getRoundById: vi.fn().mockResolvedValue({
      id: '1',
      userId: 'user-1',
      name: 'Round 1',
      roundDate: '2026-04-09',
      handicap: 12,
      courseId: null,
      statsByHole: {},
      notes: [],
      createdAt: 'now',
      updatedAt: 'now',
    }),
    insertRound: vi.fn().mockResolvedValue({
      id: '2',
      userId: 'user-1',
      name: 'New Round',
      roundDate: '2026-04-09',
      handicap: 10,
      courseId: null,
      statsByHole: {},
      notes: [],
      createdAt: 'now',
      updatedAt: 'now',
    }),
    updateRound,
    deleteRoundById,
  }));
  const updateCourse = vi.fn().mockResolvedValue({
    id: 'course-1',
    name: 'Royal Melbourne Composite',
    markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 405 } },
    createdAt: 'now',
    updatedAt: 'later',
  });
  vi.doMock('../src/db/courses.js', () => ({
    listCourses: vi.fn().mockResolvedValue([
      {
        id: 'course-1',
        name: 'Royal Melbourne',
        markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 402 } },
        createdAt: 'now',
        updatedAt: 'now',
      },
    ]),
    getCourseById: vi.fn().mockResolvedValue({
      id: 'course-1',
      name: 'Royal Melbourne',
      markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 402 } },
      createdAt: 'now',
      updatedAt: 'now',
    }),
    insertCourse: vi.fn().mockResolvedValue({
      id: 'course-2',
      name: 'Kingston Heath',
      markers: {},
      createdAt: 'now',
      updatedAt: 'now',
    }),
    updateCourse,
  }));
  const deleteClubActualEntry = vi.fn().mockResolvedValue(false);
  const saveClubCarry = vi.fn().mockResolvedValue({ Driver: 250, '7i': 158 });
  vi.doMock('../src/db/club.js', () => ({
    listClubCarry: vi.fn().mockResolvedValue({ Driver: 245, '7i': 155 }),
    saveClubCarry,
    listClubActualAverages: vi.fn().mockResolvedValue({ Driver: { shots: 3, avgMeters: 248 } }),
    insertClubActualDistance: vi.fn().mockResolvedValue({
      id: 123,
      club: 'Driver',
      actualMeters: 245,
      createdAt: 'now',
    }),
    listClubActualEntries: vi.fn().mockResolvedValue([
      {
        id: 321,
        club: 'Driver',
        actualMeters: 251,
        createdAt: 'now',
      },
    ]),
    deleteClubActualEntry,
    replaceVirtualCaddyClubActuals: vi.fn().mockResolvedValue([
      {
        id: 201,
        shotId: 1,
        club: 'Driver',
        actualMeters: 260,
        createdAt: 'now',
      },
    ]),
  }));
  vi.doMock('../src/db/users.js', () => ({
    getGoogleUserBySub: vi.fn().mockResolvedValue({
      id: 'user-google-1',
      username: 'demo-google',
      displayName: 'Demo Google',
      email: 'demo@example.com',
      authMethod: 'google',
      googleLinked: true,
      createdAt: 'now',
      updatedAt: 'now',
    }),
    linkGoogleAccount: vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'demo',
      displayName: 'Demo',
      email: 'demo@example.com',
      authMethod: 'local',
      googleLinked: true,
      createdAt: 'now',
      updatedAt: 'now',
    }),
    getUserByCredentials: vi.fn().mockImplementation(async ({ username, password }) => {
      if (username === 'demo' && password === 'secret') {
        return {
          id: 'user-1',
          username: 'demo',
          displayName: 'Demo',
          email: '',
          authMethod: 'local',
          googleLinked: false,
          createdAt: 'now',
          updatedAt: 'now',
        };
      }
      return null;
    }),
    getUserById: vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'demo',
      displayName: 'Demo',
      email: '',
      authMethod: 'local',
      googleLinked: false,
      createdAt: 'now',
      updatedAt: 'now',
    }),
  }));
  const insertWedgeEntry = vi.fn().mockResolvedValue({
    id: 10,
    matrixId: 7,
    club: '56w',
    swingClock: '10:30',
    distanceMeters: 70,
    createdAt: 'now',
  });
  const updateWedgeEntry = vi.fn().mockResolvedValue({
    id: 9,
    matrixId: 7,
    club: '50w',
    swingClock: '10:30',
    distanceMeters: 88,
    createdAt: 'now',
  });
  const updateWedgeMatrix = vi.fn().mockResolvedValue({
    id: 7,
    name: 'Flighted wedges',
    stanceWidth: 'Medium',
    grip: 'Mid',
    ballPosition: 'Back',
    notes: 'Keep hands quiet',
    clubs: ['50', '54', '58'],
    swingClocks: ['7:30', '9:00', '10:30'],
    createdAt: 'now',
  });
  const insertWedgeMatrix = vi.fn().mockResolvedValue({
    id: 8,
    name: 'Stock wedges',
    stanceWidth: 'Narrow',
    grip: 'Low',
    ballPosition: 'Middle',
    notes: 'Match tempo',
    clubs: ['50w', '56w'],
    swingClocks: ['7:30', '9:00', '10:30'],
    createdAt: 'now',
  });
  const deleteWedgeMatrix = vi.fn().mockResolvedValue(true);
  const deleteWedgeEntry = vi.fn().mockResolvedValue(true);
  vi.doMock('../src/db/wedge.js', () => ({
    listWedgeEntries: vi.fn().mockResolvedValue([
      {
        id: 9,
        matrixId: 7,
        club: '50w',
        swingClock: '9:00',
        distanceMeters: 82,
        createdAt: 'now',
      },
    ]),
    insertWedgeEntry,
    updateWedgeEntry,
    deleteWedgeEntry,
    listWedgeMatrices: vi.fn().mockResolvedValue([
      {
        id: 7,
        name: 'Flighted wedges',
        stanceWidth: 'Medium',
        grip: 'Mid',
        ballPosition: 'Back',
        notes: 'Keep hands quiet',
        clubs: ['50w', '56w', '60w'],
        swingClocks: ['7:30', '9:00', '10:30'],
        createdAt: 'now',
      },
    ]),
    insertWedgeMatrix,
    updateWedgeMatrix,
    deleteWedgeMatrix,
  }));
  vi.doMock('../src/db/debug.js', () => ({
    getDbDebugStatus: vi.fn().mockResolvedValue({ ok: true, configured: true, message: 'ok' }),
  }));

  const { handleRequest } = await import('../src/handler.js');
  const { signToken } = await import('../src/auth/jwt.js');
  return {
    handleRequest,
    signToken,
    updateWedgeMatrix,
    deleteClubActualEntry,
    updateCourse,
    updateRound,
    deleteRoundById,
    saveClubCarry,
    insertWedgeMatrix,
    insertWedgeEntry,
    updateWedgeEntry,
    deleteWedgeMatrix,
    deleteWedgeEntry,
  };
};

describe('handler', () => {
  it('returns health without auth', async () => {
    const { handleRequest } = await loadHandler();
    const { res, headers, getBody } = createMockRes();
    const req = createMockReq({ url: '/api/health' });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({ ok: true });
    expect(headers['Access-Control-Allow-Origin']).toBe('http://test-origin');
  });

  it('handles auth login', async () => {
    const { handleRequest } = await loadHandler();
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'demo', password: 'secret' },
    });

    await handleRequest(req as any, res as any);

    const payload = JSON.parse(getBody());
    expect(res.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(typeof payload.token).toBe('string');
  });

  it('rejects unauthorized access', async () => {
    const { handleRequest } = await loadHandler();
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/rounds',
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(getBody())).toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('syncs virtual caddy shot actuals', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/club-actuals/virtual-caddy-sync',
      headers: {
        authorization: `Bearer ${signToken({ subject: 'demo', userId: 'user-1' })}`,
      },
      body: {
        roundId: 'round-1',
        hole: 4,
        shots: [{ shotId: 1, club: 'Driver', actualMeters: 260 }],
      },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entries: [{ id: 201, shotId: 1, club: 'Driver', actualMeters: 260, createdAt: 'now' }],
    });
  });

  it('handles google auth login', async () => {
    const { handleRequest } = await loadHandler();
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/auth/google',
      body: { idToken: 'google-id-token' },
    });

    await handleRequest(req as any, res as any);

    const payload = JSON.parse(getBody());
    expect(res.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.user.username).toBe('demo-google');
    expect(typeof payload.token).toBe('string');
  });

  it('blocks public signup', async () => {
    const { handleRequest } = await loadHandler();
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/users',
      body: { username: 'new-user', password: 'secret123' },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(getBody())).toEqual({ ok: false, error: 'Public signup is disabled' });
  });

  it('links google auth to the current user', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/me/google-link',
      headers: { Authorization: `Bearer ${token}` },
      body: { idToken: 'google-id-token' },
    });

    await handleRequest(req as any, res as any);

    const payload = JSON.parse(getBody());
    expect(res.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.user.googleLinked).toBe(true);
    expect(payload.user.id).toBe('user-1');
  });

  it('returns the current user with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      user: {
        id: 'user-1',
        username: 'demo',
        displayName: 'Demo',
        email: '',
        authMethod: 'local',
        googleLinked: false,
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
  });

  it('returns courses with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/courses',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      courses: [
        {
          id: 'course-1',
          name: 'Royal Melbourne',
          markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 402 } },
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    });
  });

  it('returns a single course with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/courses/course-1',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      course: {
        id: 'course-1',
        name: 'Royal Melbourne',
        markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 402 } },
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
  });

  it('creates a course with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/courses',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'Kingston Heath' },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      course: {
        id: 'course-2',
        name: 'Kingston Heath',
        markers: {},
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
  });

  it('updates a course with a normalized success envelope', async () => {
    const { handleRequest, signToken, updateCourse } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'PUT',
      url: '/api/courses/course-1',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'Royal Melbourne Composite', markers: { 1: { holeIndex: 1, par: 4, teePosition: null, greenPosition: null, distanceMeters: 405 } } },
    });

    await handleRequest(req as any, res as any);

    expect(updateCourse).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      course: {
        id: 'course-1',
        name: 'Royal Melbourne Composite',
        markers: { 1: { teePosition: null, greenPosition: null, holeIndex: 1, par: 4, distanceMeters: 405 } },
        createdAt: 'now',
        updatedAt: 'later',
      },
    });
  });

  it('returns rounds with valid token', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/rounds',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(getBody());
    expect(payload.ok).toBe(true);
    expect(payload.rounds).toHaveLength(1);
    expect(payload.rounds[0].courseId).toBeNull();
  });

  it('returns a single round with normalized nullable course id', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/rounds/1',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      round: {
        id: '1',
        userId: 'user-1',
        name: 'Round 1',
        roundDate: '2026-04-09',
        handicap: 12,
        courseId: null,
        statsByHole: {},
        notes: [],
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
  });

  it('creates a round with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/rounds',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'New Round', roundDate: '2026-04-09', handicap: 10, courseId: '' },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      round: {
        id: '2',
        userId: 'user-1',
        name: 'New Round',
        roundDate: '2026-04-09',
        handicap: 10,
        courseId: null,
        statsByHole: {},
        notes: [],
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
  });

  it('updates a round with a normalized success envelope', async () => {
    const { handleRequest, signToken, updateRound } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'PUT',
      url: '/api/rounds/1',
      headers: { Authorization: `Bearer ${token}` },
      body: { handicap: 8, courseId: 'course-1', notes: ['Hit driver well'] },
    });

    await handleRequest(req as any, res as any);

    expect(updateRound).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      round: {
        id: '1',
        userId: 'user-1',
        name: 'Round 1',
        roundDate: '2026-04-09',
        handicap: 8,
        courseId: 'course-1',
        statsByHole: {},
        notes: ['Hit driver well'],
        createdAt: 'now',
        updatedAt: 'later',
      },
    });
  });

  it('updates a round score through the action endpoint', async () => {
    const { handleRequest, signToken, updateRound } = await loadHandler();
    updateRound.mockResolvedValueOnce({
      id: '1',
      userId: 'user-1',
      name: 'Round 1',
      roundDate: '2026-04-09',
      handicap: 12,
      courseId: null,
      statsByHole: { 1: { score: 3 } },
      notes: [],
      createdAt: 'now',
      updatedAt: 'later',
    });
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/rounds.updateScore',
      headers: { Authorization: `Bearer ${token}` },
      body: { round: '1', hole: 1, score: 3 },
    });

    await handleRequest(req as any, res as any);

    expect(updateRound).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      round: {
        id: '1',
        userId: 'user-1',
        name: 'Round 1',
        roundDate: '2026-04-09',
        handicap: 12,
        courseId: null,
        statsByHole: { 1: { score: 3 } },
        notes: [],
        createdAt: 'now',
        updatedAt: 'later',
      },
    });
  });

  it('deletes a round with a normalized success envelope', async () => {
    const { handleRequest, signToken, deleteRoundById } = await loadHandler();
    deleteRoundById.mockResolvedValueOnce(true);
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'DELETE',
      url: '/api/rounds/1',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({ ok: true });
  });

  it('creates a club actual entry and returns it', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/club-actuals',
      headers: { Authorization: `Bearer ${token}` },
      body: { club: 'Driver', actualMeters: 245 },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entry: {
        id: 123,
        club: 'Driver',
        actualMeters: 245,
        createdAt: 'now',
      },
    });
  });

  it('returns club carry with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/club-carry',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      carryByClub: { Driver: 245, '7i': 155 },
    });
  });

  it('saves club carry with a normalized success envelope', async () => {
    const { handleRequest, signToken, saveClubCarry } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'PUT',
      url: '/api/club-carry',
      headers: { Authorization: `Bearer ${token}` },
      body: { carryByClub: { Driver: 250, '7i': 158 } },
    });

    await handleRequest(req as any, res as any);

    expect(saveClubCarry).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      carryByClub: { Driver: 250, '7i': 158 },
    });
  });

  it('returns club actual entries with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/club-actuals/entries',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entries: [{ id: 321, club: 'Driver', actualMeters: 251, createdAt: 'now' }],
    });
  });

  it('returns club actual averages with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/club-actuals',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      averagesByClub: { Driver: { shots: 3, avgMeters: 248 } },
    });
  });

  it('returns a standard error envelope when deleting a missing club actual entry', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'DELETE',
      url: '/api/club-actuals/entries/123',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(getBody())).toEqual({ ok: false, error: 'Entry not found' });
  });

  it('returns ok when deleting an existing club actual entry', async () => {
    const { handleRequest, signToken, deleteClubActualEntry } = await loadHandler();
    deleteClubActualEntry.mockResolvedValueOnce(true);
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'DELETE',
      url: '/api/club-actuals/entries/123',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({ ok: true });
  });

  it('updates wedge matrix metadata with valid token', async () => {
    const { handleRequest, signToken, updateWedgeMatrix } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'PUT',
      url: '/api/wedge-matrices/7',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Flighted wedges',
        stanceWidth: 'Medium',
        grip: 'Mid',
        ballPosition: 'Back',
        notes: 'Keep hands quiet',
        clubs: ['50', '54', '58'],
        swingClocks: ['7:30', '9:00', '10:30'],
      },
    });

    await handleRequest(req as any, res as any);

    expect(updateWedgeMatrix).toHaveBeenCalledWith({
      id: 7,
      userId: 'user-1',
      name: 'Flighted wedges',
      stanceWidth: 'Medium',
      grip: 'Mid',
      ballPosition: 'Back',
      notes: 'Keep hands quiet',
      clubs: ['50', '54', '58'],
      swingClocks: ['7:30', '9:00', '10:30'],
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toMatchObject({
      ok: true,
      matrix: {
        id: 7,
        name: 'Flighted wedges',
      },
    });
  });

  it('creates a wedge matrix with a normalized success envelope', async () => {
    const { handleRequest, signToken, insertWedgeMatrix } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/wedge-matrices',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Stock wedges',
        stanceWidth: 'Narrow',
        grip: 'Low',
        ballPosition: 'Middle',
        notes: 'Match tempo',
        clubs: ['50w', '56w'],
        swingClocks: ['7:30', '9:00', '10:30'],
      },
    });

    await handleRequest(req as any, res as any);

    expect(insertWedgeMatrix).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      matrix: {
        id: 8,
        name: 'Stock wedges',
        stanceWidth: 'Narrow',
        grip: 'Low',
        ballPosition: 'Middle',
        notes: 'Match tempo',
        clubs: ['50w', '56w'],
        swingClocks: ['7:30', '9:00', '10:30'],
        createdAt: 'now',
      },
    });
  });

  it('creates a wedge entry with a normalized success envelope', async () => {
    const { handleRequest, signToken, insertWedgeEntry } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'POST',
      url: '/api/wedge-entries',
      headers: { Authorization: `Bearer ${token}` },
      body: { matrixId: 7, club: '56w', swingClock: '10:30', distanceMeters: 70 },
    });

    await handleRequest(req as any, res as any);

    expect(insertWedgeEntry).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entry: {
        id: 10,
        matrixId: 7,
        club: '56w',
        swingClock: '10:30',
        distanceMeters: 70,
        createdAt: 'now',
      },
    });
  });

  it('updates a wedge entry with a normalized success envelope', async () => {
    const { handleRequest, signToken, updateWedgeEntry } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'PUT',
      url: '/api/wedge-entries/9',
      headers: { Authorization: `Bearer ${token}` },
      body: { matrixId: 7, club: '50w', swingClock: '10:30', distanceMeters: 88 },
    });

    await handleRequest(req as any, res as any);

    expect(updateWedgeEntry).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entry: {
        id: 9,
        matrixId: 7,
        club: '50w',
        swingClock: '10:30',
        distanceMeters: 88,
        createdAt: 'now',
      },
    });
  });

  it('deletes a wedge matrix with a normalized success envelope', async () => {
    const { handleRequest, signToken, deleteWedgeMatrix } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'DELETE',
      url: '/api/wedge-matrices/7',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(deleteWedgeMatrix).toHaveBeenCalledWith(7, 'user-1');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({ ok: true });
  });

  it('deletes a wedge entry with a normalized success envelope', async () => {
    const { handleRequest, signToken, deleteWedgeEntry } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'DELETE',
      url: '/api/wedge-entries/9',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(deleteWedgeEntry).toHaveBeenCalledWith(9, 'user-1');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({ ok: true });
  });

  it('returns wedge matrices with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/wedge-matrices',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      matrices: [
        {
          id: 7,
          name: 'Flighted wedges',
          stanceWidth: 'Medium',
          grip: 'Mid',
          ballPosition: 'Back',
          notes: 'Keep hands quiet',
          clubs: ['50w', '56w', '60w'],
          swingClocks: ['7:30', '9:00', '10:30'],
          createdAt: 'now',
        },
      ],
    });
  });

  it('returns wedge entries with a normalized success envelope', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken({ subject: 'demo', userId: 'user-1' });
    const { res, getBody } = createMockRes();
    const req = createMockReq({
      method: 'GET',
      url: '/api/wedge-entries?matrixId=7',
      headers: { Authorization: `Bearer ${token}` },
    });

    await handleRequest(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(getBody())).toEqual({
      ok: true,
      entries: [
        {
          id: 9,
          matrixId: 7,
          club: '50w',
          swingClock: '9:00',
          distanceMeters: 82,
          createdAt: 'now',
        },
      ],
    });
  });
});
