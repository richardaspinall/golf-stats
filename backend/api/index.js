import { handleRequest } from '../dist/handler.js';

export default async function handler(req, res) {
  await handleRequest(req, res);
}
