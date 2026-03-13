import type { IncomingMessage, ServerResponse } from 'node:http';
import { AUTH_CONFIGURED, DB_CONFIGURED, GOOGLE_AUTH_CONFIGURED, JWT_TTL_SECONDS } from './config/env.js';
import { verifyGoogleIdToken } from './auth/google.js';
import { signToken, verifyToken } from './auth/jwt.js';
import { getDbDebugStatus } from './db/debug.js';
import { ensureSchema } from './db/schema.js';
import { deleteRoundById, getRoundById, insertRound, listRounds, updateRound } from './db/rounds.js';
import { getCourseById, insertCourse, listCourses, updateCourse } from './db/courses.js';
import {
  deleteClubActualEntry,
  insertClubActualDistance,
  listClubActualAverages,
  listClubActualEntries,
  listClubCarry,
  saveClubCarry,
} from './db/club.js';
import { getGoogleUserBySub, getUserByCredentials, getUserById, linkGoogleAccount } from './db/users.js';
import {
  deleteWedgeEntry,
  deleteWedgeMatrix,
  insertWedgeEntry,
  insertWedgeMatrix,
  listWedgeEntries,
  listWedgeMatrices,
  updateWedgeMatrix,
  updateWedgeEntry,
} from './db/wedge.js';
import { buildInitialByHole, buildInitialCourseMarkers, createCourse, createRound } from './domain/factories.js';
import {
  sanitizeCourseMarkers,
  sanitizeCourseName,
  sanitizeRoundDate,
  sanitizeRoundHandicap,
  sanitizeRoundName,
  sanitizeRoundNotes,
  sanitizeStats,
} from './domain/sanitize.js';
import { getBearerToken, getUrl, parseBody, sendJson, type BodyAwareRequest } from './utils/http.js';

export const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
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

    if (
      pathname === '/api/users' ||
      pathname === '/api/me' ||
      pathname === '/api/me/google-link' ||
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/google'
    ) {
      await ensureSchema();
    }

    if (pathname === '/api/users' && method === 'POST') {
      sendJson(res, 403, { ok: false, error: 'Public signup is disabled' });
      return;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      if (!AUTH_CONFIGURED) {
        sendJson(res, 500, { ok: false, error: 'Auth is not configured on the server' });
        return;
      }

      try {
        const body = await parseBody(req as BodyAwareRequest);
        const user = await getUserByCredentials({
          username: (body as any)?.username,
          password: (body as any)?.password,
        });

        if (!user) {
          sendJson(res, 401, { ok: false, error: 'Invalid credentials' });
          return;
        }

        const token = signToken({ subject: user.username, userId: user.id });
        sendJson(res, 200, { ok: true, token, user, expiresIn: Math.max(60, Math.floor(JWT_TTL_SECONDS)) });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    if (pathname === '/api/auth/google' && method === 'POST') {
      if (!AUTH_CONFIGURED || !GOOGLE_AUTH_CONFIGURED) {
        sendJson(res, 500, { ok: false, error: 'Google auth is not configured on the server' });
        return;
      }

      try {
        const body = await parseBody(req as BodyAwareRequest);
        const idToken = String((body as any)?.idToken || '').trim();
        if (!idToken) {
          sendJson(res, 400, { ok: false, error: 'Missing Google credential' });
          return;
        }

        const profile = await verifyGoogleIdToken(idToken);
        const user = await getGoogleUserBySub(profile);
        if (!user) {
          sendJson(res, 403, { ok: false, error: 'That Google account is not linked to an existing user' });
          return;
        }
        const token = signToken({ subject: user.username, userId: user.id });
        sendJson(res, 200, { ok: true, token, user, expiresIn: Math.max(60, Math.floor(JWT_TTL_SECONDS)) });
      } catch (error: any) {
        sendJson(res, 401, { ok: false, error: error.message || 'Invalid Google credential' });
      }
      return;
    }

    let authUser: { id: string; username: string } | null = null;
    if (pathname.startsWith('/api/') && pathname !== '/api/health' && !(pathname === '/api/users' && method === 'POST')) {
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

      authUser = {
        id: String(tokenState.payload.uid),
        username: String(tokenState.payload.sub),
      };
    }

    const currentUserId = authUser?.id || '';

    if (pathname === '/api/me' && method === 'GET') {
      const user = authUser ? await getUserById(authUser.id) : null;
      if (!user) {
        sendJson(res, 404, { ok: false, error: 'User not found' });
        return;
      }
      sendJson(res, 200, { user });
      return;
    }

    if (pathname === '/api/me/google-link' && method === 'POST') {
      if (!GOOGLE_AUTH_CONFIGURED) {
        sendJson(res, 500, { ok: false, error: 'Google auth is not configured on the server' });
        return;
      }

      try {
        const body = await parseBody(req as BodyAwareRequest);
        const idToken = String((body as any)?.idToken || '').trim();
        if (!idToken) {
          sendJson(res, 400, { ok: false, error: 'Missing Google credential' });
          return;
        }

        const profile = await verifyGoogleIdToken(idToken);
        const user = await linkGoogleAccount({
          userId: currentUserId,
          ...profile,
        });
        if (!user) {
          sendJson(res, 404, { ok: false, error: 'User not found' });
          return;
        }

        sendJson(res, 200, { ok: true, user });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Unable to link Google account' });
      }
      return;
    }

    if (pathname === '/api/debug/db' && method === 'GET') {
      const debug = await getDbDebugStatus();
      sendJson(res, debug.ok ? 200 : 500, debug);
      return;
    }

    if (
      pathname === '/api/rounds' ||
      pathname.startsWith('/api/rounds/') ||
      pathname === '/api/courses' ||
      pathname.startsWith('/api/courses/') ||
      pathname === '/api/club-carry' ||
      pathname === '/api/club-actuals/entries' ||
      pathname.startsWith('/api/club-actuals/entries/') ||
      pathname === '/api/club-actuals' ||
      pathname === '/api/wedge-entries' ||
      pathname.startsWith('/api/wedge-entries/') ||
      pathname === '/api/wedge-matrices' ||
      pathname.startsWith('/api/wedge-matrices/')
    ) {
      await ensureSchema();
    }

    if (!authUser && pathname.startsWith('/api/')) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }

    if (pathname === '/api/courses' && method === 'GET') {
      sendJson(res, 200, { courses: await listCourses() });
      return;
    }

    if (pathname === '/api/courses' && method === 'POST') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        const existingCourses = await listCourses();
        const courseName = sanitizeCourseName((body as any)?.name, existingCourses.length + 1);
        const newCourse = createCourse(courseName, (body as any)?.markers ?? buildInitialCourseMarkers());
        const inserted = await insertCourse(newCourse);
        sendJson(res, 201, { course: inserted });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    const courseMatch = pathname.match(/^\/api\/courses\/([^/]+)$/);
    if (courseMatch) {
      const courseId = decodeURIComponent(courseMatch[1]);

      if (method === 'GET') {
        const course = await getCourseById(courseId);
        if (!course) {
          sendJson(res, 404, { ok: false, error: 'Course not found' });
          return;
        }

        sendJson(res, 200, { course });
        return;
      }

      if (method === 'PUT') {
        try {
          const current = await getCourseById(courseId);
          if (!current) {
            sendJson(res, 404, { ok: false, error: 'Course not found' });
            return;
          }

          const body = await parseBody(req as BodyAwareRequest);
          const updated = await updateCourse(courseId, {
            name: sanitizeCourseName((body as any)?.name ?? current.name),
            markers: sanitizeCourseMarkers((body as any)?.markers ?? current.markers),
            updatedAt: new Date().toISOString(),
          });

          sendJson(res, 200, { ok: true, course: updated });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }
    }

    if (pathname === '/api/rounds' && method === 'GET') {
      sendJson(res, 200, { rounds: await listRounds(currentUserId) });
      return;
    }

    if (pathname === '/api/rounds' && method === 'POST') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        const existingRounds = await listRounds(currentUserId);
        const roundName = sanitizeRoundName((body as any)?.name, existingRounds.length + 1);
        const rawCourseId = String((body as any)?.courseId || '').trim();
        if (rawCourseId) {
          const course = await getCourseById(rawCourseId);
          if (!course) {
            sendJson(res, 400, { ok: false, error: 'Course not found' });
            return;
          }
        }
        const newRound = createRound(
          currentUserId,
          roundName,
          sanitizeRoundDate((body as any)?.roundDate),
          sanitizeRoundHandicap((body as any)?.handicap),
          (body as any)?.statsByHole ?? buildInitialByHole(),
          (body as any)?.notes ?? '',
        );
        newRound.courseId = rawCourseId || null;
        const inserted = await insertRound(newRound);
        sendJson(res, 201, { round: inserted });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    const roundMatch = pathname.match(/^\/api\/rounds\/([^/]+)$/);
    if (roundMatch) {
      const roundId = decodeURIComponent(roundMatch[1]);

      if (method === 'GET') {
        const round = await getRoundById(roundId, currentUserId);
        if (!round) {
          sendJson(res, 404, { ok: false, error: 'Round not found' });
          return;
        }

        sendJson(res, 200, { round });
        return;
      }

      if (method === 'PUT') {
        try {
          const current = await getRoundById(roundId, currentUserId);
          if (!current) {
            sendJson(res, 404, { ok: false, error: 'Round not found' });
            return;
          }

          const body = await parseBody(req as BodyAwareRequest);
          const hasHandicap = Object.prototype.hasOwnProperty.call(body || {}, 'handicap');
          const hasCourseId = Object.prototype.hasOwnProperty.call(body || {}, 'courseId');
          const handicap = hasHandicap ? sanitizeRoundHandicap((body as any)?.handicap) : current.handicap;
          let courseId = current.courseId || null;
          if (hasCourseId) {
            const rawCourseId = String((body as any)?.courseId || '').trim();
            if (rawCourseId) {
              const course = await getCourseById(rawCourseId);
              if (!course) {
                sendJson(res, 400, { ok: false, error: 'Course not found' });
                return;
              }
              courseId = rawCourseId;
            } else {
              courseId = null;
            }
          }
          const updated = await updateRound(roundId, {
            userId: currentUserId,
            name: sanitizeRoundName((body as any)?.name ?? current.name),
            roundDate: sanitizeRoundDate((body as any)?.roundDate ?? current.roundDate),
            handicap,
            courseId,
            statsByHole: sanitizeStats((body as any)?.statsByHole ?? current.statsByHole),
            notes: sanitizeRoundNotes((body as any)?.notes ?? current.notes),
            updatedAt: new Date().toISOString(),
          });

          sendJson(res, 200, { ok: true, round: updated });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }

      if (method === 'DELETE') {
        const deleted = await deleteRoundById(roundId, currentUserId);
        if (!deleted) {
          sendJson(res, 404, { ok: false, error: 'Round not found' });
          return;
        }

        sendJson(res, 200, { ok: true });
        return;
      }
    }

    if (pathname === '/api/club-carry' && method === 'GET') {
      sendJson(res, 200, { carryByClub: await listClubCarry(currentUserId) });
      return;
    }

    if (pathname === '/api/club-carry' && method === 'PUT') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        const saved = await saveClubCarry(currentUserId, (body as any)?.carryByClub);
        sendJson(res, 200, { ok: true, carryByClub: saved });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    if (pathname === '/api/club-actuals/entries' && method === 'GET') {
      sendJson(res, 200, { entries: await listClubActualEntries(currentUserId) });
      return;
    }

    const clubActualEntryMatch = pathname.match(/^\/api\/club-actuals\/entries\/(\d+)$/);
    if (clubActualEntryMatch && method === 'DELETE') {
      const entryId = Number(clubActualEntryMatch[1]);
      if (!Number.isFinite(entryId) || entryId <= 0) {
        sendJson(res, 400, { ok: false, error: 'Invalid entry id' });
        return;
      }
      const deleted = await deleteClubActualEntry(entryId, currentUserId);
      sendJson(res, deleted ? 200 : 404, { ok: deleted });
      return;
    }

    if (pathname === '/api/club-actuals' && method === 'GET') {
      sendJson(res, 200, { averagesByClub: await listClubActualAverages(currentUserId) });
      return;
    }

    if (pathname === '/api/club-actuals' && method === 'POST') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        await insertClubActualDistance({
          userId: currentUserId,
          club: String((body as any)?.club || '').trim(),
          actualMeters: (body as any)?.actualMeters,
        });
        sendJson(res, 201, { ok: true });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    if (pathname === '/api/wedge-entries' && method === 'GET') {
      const matrixIdRaw = requestUrl.searchParams.get('matrixId');
      const matrixId = matrixIdRaw ? Number(matrixIdRaw) : null;
      sendJson(res, 200, { entries: await listWedgeEntries(currentUserId, matrixId) });
      return;
    }

    if (pathname === '/api/wedge-entries' && method === 'POST') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        const entry = await insertWedgeEntry({
          userId: currentUserId,
          matrixId: Number((body as any)?.matrixId),
          club: String((body as any)?.club || '').trim(),
          swingClock: String((body as any)?.swingClock || '').trim(),
          distanceMeters: (body as any)?.distanceMeters,
        });
        sendJson(res, 201, { ok: true, entry });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    const wedgeMatch = pathname.match(/^\/api\/wedge-entries\/(\d+)$/);
    if (wedgeMatch) {
      const entryId = Number(wedgeMatch[1]);
      if (!Number.isFinite(entryId) || entryId <= 0) {
        sendJson(res, 400, { ok: false, error: 'Invalid entry id' });
        return;
      }

      if (method === 'PUT') {
        try {
          const body = await parseBody(req as BodyAwareRequest);
          const entry = await updateWedgeEntry({
            id: entryId,
            userId: currentUserId,
            matrixId: Number((body as any)?.matrixId),
            club: String((body as any)?.club || '').trim(),
            swingClock: String((body as any)?.swingClock || '').trim(),
            distanceMeters: (body as any)?.distanceMeters,
          });
          if (!entry) {
            sendJson(res, 404, { ok: false, error: 'Entry not found' });
            return;
          }
          sendJson(res, 200, { ok: true, entry });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }

      if (method === 'DELETE') {
        try {
          const deleted = await deleteWedgeEntry(entryId, currentUserId);
          if (!deleted) {
            sendJson(res, 404, { ok: false, error: 'Entry not found' });
            return;
          }
          sendJson(res, 200, { ok: true });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }
    }

    if (pathname === '/api/wedge-matrices' && method === 'GET') {
      sendJson(res, 200, { matrices: await listWedgeMatrices(currentUserId) });
      return;
    }

    if (pathname === '/api/wedge-matrices' && method === 'POST') {
      try {
        const body = await parseBody(req as BodyAwareRequest);
        const matrix = await insertWedgeMatrix({
          userId: currentUserId,
          name: String((body as any)?.name || '').trim(),
          stanceWidth: String((body as any)?.stanceWidth || '').trim(),
          grip: String((body as any)?.grip || '').trim(),
          ballPosition: String((body as any)?.ballPosition || '').trim(),
          notes: String((body as any)?.notes || '').trim(),
          clubs: Array.isArray((body as any)?.clubs) ? (body as any).clubs : [],
          swingClocks: Array.isArray((body as any)?.swingClocks) ? (body as any).swingClocks : [],
        });
        sendJson(res, 201, { ok: true, matrix });
      } catch (error: any) {
        sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
      }
      return;
    }

    const matrixMatch = pathname.match(/^\/api\/wedge-matrices\/(\d+)$/);
    if (matrixMatch) {
      const matrixId = Number(matrixMatch[1]);
      if (!Number.isFinite(matrixId) || matrixId <= 0) {
        sendJson(res, 400, { ok: false, error: 'Invalid matrix id' });
        return;
      }

      if (method === 'PUT') {
        try {
          const body = await parseBody(req as BodyAwareRequest);
          const matrix = await updateWedgeMatrix({
            id: matrixId,
            userId: currentUserId,
            name: String((body as any)?.name || '').trim(),
            stanceWidth: String((body as any)?.stanceWidth || '').trim(),
            grip: String((body as any)?.grip || '').trim(),
            ballPosition: String((body as any)?.ballPosition || '').trim(),
            notes: String((body as any)?.notes || '').trim(),
            clubs: Array.isArray((body as any)?.clubs) ? (body as any).clubs : [],
            swingClocks: Array.isArray((body as any)?.swingClocks) ? (body as any).swingClocks : [],
          });
          if (!matrix) {
            sendJson(res, 404, { ok: false, error: 'Matrix not found' });
            return;
          }
          sendJson(res, 200, { ok: true, matrix });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }

      if (method === 'DELETE') {
        try {
          const deleted = await deleteWedgeMatrix(matrixId, currentUserId);
          if (!deleted) {
            sendJson(res, 404, { ok: false, error: 'Matrix not found' });
            return;
          }
          sendJson(res, 200, { ok: true });
        } catch (error: any) {
          sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' });
        }
        return;
      }
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (error: any) {
    if (!res.headersSent) {
      const isMisconfigured = !DB_CONFIGURED && String(error?.message || '').includes('DATABASE_URL');
      sendJson(res, 500, {
        ok: false,
        error: isMisconfigured ? 'DATABASE_URL is not configured' : 'Internal server error',
        detail: error?.message || 'Unknown error',
      });
      return;
    }
  }
};
