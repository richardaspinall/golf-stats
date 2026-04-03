import { COUNTER_OPTIONS } from './constants';
import type { HolePrepPlan, HoleStats } from '../types';

export const HOLE_PREP_LIMITS = {
  strategy: 280,
  danger: 180,
  aim: 180,
  plannedTeeClub: 80,
  plannedLayupClub: 80,
  commitmentCue: 120,
} as const;

export const emptyHolePrepPlan = (): HolePrepPlan => ({
  strategy: '',
  danger: '',
  aim: '',
  plannedTeeClub: '',
  plannedLayupClub: '',
  commitmentCue: '',
});

export const sanitizeHolePrepPlan = (raw: unknown): HolePrepPlan => {
  const source = raw && typeof raw === 'object' ? (raw as Partial<Record<keyof HolePrepPlan, unknown>>) : {};

  return {
    strategy: String(source.strategy || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.strategy),
    danger: String(source.danger || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.danger),
    aim: String(source.aim || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.aim),
    plannedTeeClub: String(source.plannedTeeClub || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.plannedTeeClub),
    plannedLayupClub: String(source.plannedLayupClub || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.plannedLayupClub),
    commitmentCue: String(source.commitmentCue || '')
      .trim()
      .slice(0, HOLE_PREP_LIMITS.commitmentCue),
  };
};

export const hasHolePrepPlanContent = (prepPlan: HolePrepPlan | null | undefined): boolean =>
  Boolean(
    prepPlan &&
      Object.values(prepPlan).some((value) => typeof value === 'string' && value.trim().length > 0),
  );

export const hasHolePlayStarted = (holeStats: HoleStats): boolean => {
  const trail = holeStats.virtualCaddyState?.trail;
  if (Array.isArray(trail) && trail.length > 0) {
    return true;
  }

  if (Boolean(holeStats.manualScoreEnteredOnTrack) || Number(holeStats.score || 0) > 0) {
    return true;
  }

  if (holeStats.fairwaySelection || holeStats.girSelection) {
    return true;
  }

  return COUNTER_OPTIONS.some(({ key }) => Number(holeStats[key] || 0) > 0);
};
