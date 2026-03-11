import { COUNTER_OPTIONS, HOLES } from '../constants.js';
import type { ClubCarryByClub, CourseMarkersByHole, LatLng, StatsByHole } from './types.js';
import { buildInitialByHole, buildInitialCourseMarkers } from './initial.js';
import { isBunkerSelection, isClubOption, isFairwaySelection, isGirSelection, isWedgeOption } from './guards.js';

export const sanitizeLatLng = (value: unknown): LatLng | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const lat = Number((value as LatLng).lat);
  const lng = Number((value as LatLng).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
};

export const sanitizeStats = (raw: unknown): StatsByHole => {
  const safe = buildInitialByHole();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const holeRaw = (raw as StatsByHole)[hole];
    if (!holeRaw || typeof holeRaw !== 'object') {
      return;
    }

    COUNTER_OPTIONS.forEach((key) => {
      const value = Number(holeRaw[key]);
      safe[hole][key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    const score = Number(holeRaw.score);
    safe[hole].score = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;

    const holeIndex = Number(holeRaw.holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex) ? Math.min(18, Math.max(1, Math.floor(holeIndex))) : hole;

    safe[hole].fairwaySelection = isFairwaySelection(holeRaw.fairwaySelection)
      ? holeRaw.fairwaySelection
      : null;
    safe[hole].girSelection = isGirSelection(holeRaw.girSelection) ? holeRaw.girSelection : null;
    safe[hole].bunkerSelection = isBunkerSelection(holeRaw.bunkerSelection) ? holeRaw.bunkerSelection : null;
    safe[hole].teePosition = sanitizeLatLng(holeRaw.teePosition);
    safe[hole].greenPosition = sanitizeLatLng(holeRaw.greenPosition);
  });

  return safe;
};

export const sanitizeCourseMarkers = (raw: unknown): CourseMarkersByHole => {
  const safe = buildInitialCourseMarkers();
  if (!raw || typeof raw !== 'object') {
    return safe;
  }

  HOLES.forEach((hole) => {
    const holeRaw = (raw as CourseMarkersByHole)[hole];
    if (!holeRaw || typeof holeRaw !== 'object') {
      return;
    }

    safe[hole].teePosition = sanitizeLatLng(holeRaw.teePosition);
    safe[hole].greenPosition = sanitizeLatLng(holeRaw.greenPosition);
    const holeIndex = Number(holeRaw.holeIndex);
    safe[hole].holeIndex = Number.isFinite(holeIndex)
      ? Math.min(18, Math.max(1, Math.floor(holeIndex)))
      : hole;
    const par = Number(holeRaw.par);
    safe[hole].par = Number.isFinite(par) ? Math.min(6, Math.max(3, Math.floor(par))) : 4;
  });

  return safe;
};

export const sanitizeRoundName = (raw: unknown, fallbackIndex = 1) => {
  const value = String(raw || '').trim();
  return value ? value.slice(0, 80) : `Round ${fallbackIndex}`;
};

export const sanitizeRoundDate = (raw: unknown) => {
  const value = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const sanitizeCourseName = (raw: unknown, fallbackIndex = 1) => {
  const value = String(raw || '').trim();
  return value ? value.slice(0, 80) : `Course ${fallbackIndex}`;
};

export const sanitizeRoundNotes = (raw: unknown) => {
  if (Array.isArray(raw)) {
    return raw
      .map((note) => String(note || '').trim().slice(0, 1000))
      .filter(Boolean)
      .slice(0, 300);
  }

  const legacy = String(raw || '').trim();
  return legacy ? [legacy.slice(0, 1000)] : [];
};

export const sanitizeCarryMeters = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.min(400, Math.round(value));
};

export const sanitizeClubCarryPayload = (raw: unknown): ClubCarryByClub => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw as Record<string, unknown>).reduce((acc, [club, carryValue]) => {
    if (!isClubOption(club)) {
      return acc;
    }

    const sanitizedCarry = sanitizeCarryMeters(carryValue);
    if (sanitizedCarry === null) {
      return acc;
    }

    acc[club] = sanitizedCarry;
    return acc;
  }, {} as ClubCarryByClub);
};

export const sanitizeActualMeters = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.min(500, Math.round(value));
};

export const sanitizeWedgeDistanceMeters = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.min(200, Math.round(value));
};

export const sanitizeWedgeEntryPayload = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const club = (raw as any).club;
  const swingClock = String((raw as any).swingClock || '').trim().slice(0, 40);
  if (!isWedgeOption(club) || !swingClock) {
    return null;
  }

  const distanceMeters = sanitizeWedgeDistanceMeters((raw as any).distanceMeters);
  if (distanceMeters === null) {
    return null;
  }

  return { club, swingClock, distanceMeters };
};
