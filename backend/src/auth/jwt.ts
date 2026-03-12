import crypto from 'node:crypto';
import { JWT_SECRET, JWT_TTL_SECONDS } from '../config/env.js';
import { safeCompare } from './crypto.js';

const toBase64Url = (value: string) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

export const signToken = ({ subject, userId }: { subject: string; userId: string }) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: subject,
    uid: userId,
    iat: now,
    exp: now + Math.max(60, Math.floor(JWT_TTL_SECONDS)),
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${signingInput}.${signature}`;
};

export const verifyToken = (token: string) => {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { ok: false as const, error: 'Malformed token' };
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signingInput)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (!safeCompare(encodedSignature, expectedSignature)) {
      return { ok: false as const, error: 'Invalid token signature' };
    }

    const payload = JSON.parse(fromBase64Url(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.sub || !payload?.uid) {
      return { ok: false as const, error: 'Invalid subject' };
    }

    if (!payload?.exp || now >= payload.exp) {
      return { ok: false as const, error: 'Token expired' };
    }

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, error: 'Invalid token' };
  }
};
