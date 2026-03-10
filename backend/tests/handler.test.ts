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
      AUTH_CONFIGURED: true,
      DB_CONFIGURED: true,
    };
  });

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
    insertClubActualDistance: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../src/db/debug.js', () => ({
    getDbDebugStatus: vi.fn().mockResolvedValue({ ok: true, configured: true, message: 'ok' }),
  }));

  const { handleRequest } = await import('../src/handler.js');
  const { signToken } = await import('../src/auth/jwt.js');
  return { handleRequest, signToken };
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

  it('returns rounds with valid token', async () => {
    const { handleRequest, signToken } = await loadHandler();
    const token = signToken('demo');
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
});
