import { buildInitialByHole, createRound } from '../../domain/factories.js';
import {
  sanitizeRoundDate,
  sanitizeRoundHandicap,
  sanitizeRoundName,
  sanitizeRoundNotes,
  sanitizeStats,
} from '../../domain/sanitize.js';
import { ValidationError } from '../../app/http/AppError.js';
import { CourseRepository } from '../courses/CourseRepository.js';
import { RoundRepository } from './RoundRepository.js';

export class RoundsService {
  static async createRound(userId: string, payload: unknown) {
    const body = payload as any;
    const existingRounds = await RoundRepository.listByUserId(userId);
    const roundName = sanitizeRoundName(body?.name, existingRounds.length + 1);
    const rawCourseId = String(body?.courseId || '').trim();

    if (rawCourseId) {
      const course = await CourseRepository.findById(rawCourseId);
      if (!course) {
        throw new ValidationError('Course not found');
      }
    }

    const round = createRound(
      userId,
      roundName,
      sanitizeRoundDate(body?.roundDate),
      sanitizeRoundHandicap(body?.handicap),
      body?.statsByHole ?? buildInitialByHole(),
      body?.notes ?? '',
    );
    round.courseId = rawCourseId || null;

    return RoundRepository.create(round);
  }

  static async updateRound(userId: string, roundId: string, payload: unknown) {
    const current = await RoundRepository.findById(roundId, userId);
    if (!current) {
      return null;
    }

    const body = payload as Record<string, unknown>;
    const hasHandicap = Object.prototype.hasOwnProperty.call(body || {}, 'handicap');
    const hasCourseId = Object.prototype.hasOwnProperty.call(body || {}, 'courseId');

    const handicap = hasHandicap ? sanitizeRoundHandicap((body as any)?.handicap) : current.handicap;
    let courseId = current.courseId || null;

    if (hasCourseId) {
      const rawCourseId = String((body as any)?.courseId || '').trim();
      if (rawCourseId) {
        const course = await CourseRepository.findById(rawCourseId);
        if (!course) {
          throw new ValidationError('Course not found');
        }
        courseId = rawCourseId;
      } else {
        courseId = null;
      }
    }

    return RoundRepository.update(roundId, {
      userId,
      name: sanitizeRoundName((body as any)?.name ?? current.name),
      roundDate: sanitizeRoundDate((body as any)?.roundDate ?? current.roundDate),
      handicap,
      courseId,
      statsByHole: sanitizeStats((body as any)?.statsByHole ?? current.statsByHole),
      notes: sanitizeRoundNotes((body as any)?.notes ?? current.notes),
      updatedAt: new Date().toISOString(),
    });
  }

  static async updateRoundScore(userId: string, roundId: string, hole: number, score: number) {
    const current = await RoundRepository.findById(roundId, userId);
    if (!current) {
      return null;
    }

    const safeHole = Math.floor(Number(hole));
    if (!Number.isFinite(safeHole) || safeHole < 1 || safeHole > 18) {
      throw new ValidationError('Invalid hole');
    }

    const safeScore = Math.floor(Number(score));
    if (!Number.isFinite(safeScore) || safeScore < 0 || safeScore > 20) {
      throw new ValidationError('Invalid score');
    }

    const statsByHole = sanitizeStats(current.statsByHole);
    statsByHole[safeHole] = {
      ...statsByHole[safeHole],
      score: safeScore,
    };

    return RoundRepository.update(roundId, {
      userId,
      name: current.name,
      roundDate: current.roundDate,
      handicap: current.handicap,
      courseId: current.courseId,
      statsByHole,
      notes: current.notes,
      updatedAt: new Date().toISOString(),
    });
  }
}
