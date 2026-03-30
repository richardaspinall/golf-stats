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
  vi.doMock('../src/db/rounds.js', () => ({
    listRounds: vi.fn().mockResolvedValue([{ id: '1', name: 'Round 1', courseId: '', createdAt: 'now', updatedAt: 'now' }]),
    getRoundById: vi.fn().mockResolvedValue(null),
    insertRound: vi.fn(),
    updateRound: vi.fn(),
    deleteRoundById: vi.fn(),
  }));
  vi.doMock('../src/db/courses.js', () => ({
    listCourses: vi.fn().mockResolvedValue([]),
    getCourseById: vi.fn().mockResolvedValue(null),
    insertCourse: vi.fn(),
    updateCourse: vi.fn(),
  }));
  vi.doMock('../src/db/club.js', () => ({
    listClubCarry: vi.fn().mockResolvedValue({}),
    saveClubCarry: vi.fn().mockResolvedValue({}),
    listClubActualAverages: vi.fn().mockResolvedValue({}),
    insertClubActualDistance: vi.fn().mockResolvedValue({
      id: 123,
      club: 'Driver',
      actualMeters: 245,
      createdAt: 'now',
    }),
    listClubActualEntries: vi.fn().mockResolvedValue([]),
    deleteClubActualEntry: vi.fn().mockResolvedValue(false),
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
  vi.doMock('../src/db/wedge.js', () => ({
    listWedgeEntries: vi.fn().mockResolvedValue([]),
    insertWedgeEntry: vi.fn(),
    updateWedgeEntry: vi.fn(),
    deleteWedgeEntry: vi.fn(),
    listWedgeMatrices: vi.fn().mockResolvedValue([]),
    insertWedgeMatrix: vi.fn(),
    updateWedgeMatrix,
    deleteWedgeMatrix: vi.fn(),
  }));
  vi.doMock('../src/db/debug.js', () => ({
    getDbDebugStatus: vi.fn().mockResolvedValue({ ok: true, configured: true, message: 'ok' }),
  }));

  const { handleRequest } = await import('../src/handler.js');
  const { signToken } = await import('../src/auth/jwt.js');
  return { handleRequest, signToken, updateWedgeMatrix };
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
    expect(payload.rounds).toHaveLength(1);
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
});
