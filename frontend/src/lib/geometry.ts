import type { LatLng } from '../types';

const METERS_PER_PACE = 0.83;

export const metersToPaces = (meters: number): number => Math.round(meters / METERS_PER_PACE);
export const pacesToMeters = (paces: number): number => Math.round(paces * METERS_PER_PACE);

export const distanceMetersBetween = (start: LatLng, end: LatLng): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMeters = 6371000;
  return earthRadiusMeters * c;
};

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
