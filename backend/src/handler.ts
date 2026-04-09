import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpRouter } from './app/http/HttpRouter.js';
import { routes } from './app/http/routes.js';
import { DB_CONFIGURED } from './config/env.js';
import { getUrl, sendJson } from './utils/http.js';

const router = new HttpRouter(routes);

export const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const method = req.method || 'GET';
    if (method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (await router.handle(req, res)) {
      return;
    }
    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (error: any) {
    if (!res.headersSent) {
      const pathname = getUrl(req).pathname;
      const isMisconfigured = !DB_CONFIGURED && String(error?.message || '').includes('DATABASE_URL');
      sendJson(res, 500, {
        ok: false,
        error: isMisconfigured ? 'DATABASE_URL is not configured' : 'Internal server error',
        detail: error?.message || 'Unknown error',
      });
    }
  }
};
