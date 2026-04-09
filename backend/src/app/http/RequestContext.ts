import type { IncomingMessage, ServerResponse } from 'node:http';

export type AuthUser = {
  id: string;
  username: string;
};

export type RequestContext = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  method: string;
  pathname: string;
  body: () => Promise<unknown>;
  authUser: AuthUser | null;
};
