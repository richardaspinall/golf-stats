import type { IncomingMessage, ServerResponse } from 'node:http';
import { AUTH_CONFIGURED } from '../../config/env.js';
import { ensureSchema } from '../../db/schema.js';
import { getBearerToken, getUrl, parseBody, sendJson, type BodyAwareRequest } from '../../utils/http.js';
import { verifyToken } from '../../auth/jwt.js';
import { AppError, ConfigurationError, UnauthorizedError } from './AppError.js';
import type { BaseHandler } from './BaseHandler.js';
import type { AuthUser, RequestContext } from './RequestContext.js';

type HandlerConstructor = new (ctx: RequestContext, params: Record<string, string>) => BaseHandler<any, any>;

export type RouteDefinition = {
  method: string;
  path: string | RegExp;
  requiresAuth?: boolean;
  ensureSchema?: boolean;
  handler: HandlerConstructor;
};

type MatchResult = {
  route: RouteDefinition;
  params: Record<string, string>;
};

const matchPath = (routePath: string | RegExp, pathname: string): Record<string, string> | null => {
  if (typeof routePath === 'string') {
    return routePath === pathname ? {} : null;
  }

  const match = pathname.match(routePath);
  if (!match) {
    return null;
  }

  return match.slice(1).reduce<Record<string, string>>((params, value, index) => {
    params[String(index)] = decodeURIComponent(value);
    return params;
  }, {});
};

export class HttpRouter {
  constructor(private readonly routes: RouteDefinition[]) {}

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = getUrl(req);
    const method = req.method || 'GET';
    const pathname = url.pathname;
    const matched = this.findMatch(method, pathname);

    if (!matched) {
      return false;
    }

    try {
      if (matched.route.ensureSchema) {
        await ensureSchema();
      }

      const authUser = matched.route.requiresAuth ? this.getAuthUser(req) : null;
      const body = this.buildBodyReader(req as BodyAwareRequest);
      const ctx: RequestContext = {
        req,
        res,
        url,
        method,
        pathname,
        body,
        authUser,
      };

      const handler = new matched.route.handler(ctx, matched.params);
      await handler.handle();
      return true;
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      sendJson(res, appError?.status ?? 500, {
        ok: false,
        error: appError?.message || 'Internal server error',
      });
      return true;
    }
  }

  private findMatch(method: string, pathname: string): MatchResult | null {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const params = matchPath(route.path, pathname);
      if (params) {
        return { route, params };
      }
    }

    return null;
  }

  private getAuthUser(req: IncomingMessage): AuthUser {
    if (!AUTH_CONFIGURED) {
      throw new ConfigurationError('Auth is not configured on the server');
    }

    const token = getBearerToken(req);
    const tokenState = verifyToken(token);
    if (!tokenState.ok) {
      throw new UnauthorizedError('Unauthorized');
    }

    return {
      id: String(tokenState.payload.uid),
      username: String(tokenState.payload.sub),
    };
  }

  private buildBodyReader(req: BodyAwareRequest) {
    let bodyPromise: Promise<unknown> | null = null;

    return async () => {
      if (!bodyPromise) {
        bodyPromise = parseBody(req);
      }

      return bodyPromise;
    };
  }
}
