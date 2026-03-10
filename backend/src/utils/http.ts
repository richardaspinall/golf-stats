import type { IncomingMessage, ServerResponse } from 'node:http';
import { CORS_ORIGIN } from '../config/env.js';

export type BodyAwareRequest = IncomingMessage & { body?: unknown };

export const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
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

export const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(payload));
};

export const parseBody = async (req: BodyAwareRequest) => {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : {};
    }

    if (req.body && typeof req.body === 'object') {
      return req.body;
    }

    return {};
  }

  const bodyRaw = await readBody(req);
  return bodyRaw ? JSON.parse(bodyRaw) : {};
};

export const getUrl = (req: IncomingMessage) => {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `http://${host}`);
};

export const getBearerToken = (req: IncomingMessage) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!value || !value.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
};
