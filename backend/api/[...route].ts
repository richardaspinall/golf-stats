import { handleRequest } from '../src/handler.js';

export default async function handler(req: any, res: any) {
  await handleRequest(req, res);
}
