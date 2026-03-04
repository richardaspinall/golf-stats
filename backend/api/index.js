import { handleRequest } from '../src/api.js';

export default async function handler(req, res) {
  await handleRequest(req, res);
}
