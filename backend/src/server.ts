import http from 'node:http';
import { handleRequest } from './handler.js';

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer(async (req, res) => {
  await handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
