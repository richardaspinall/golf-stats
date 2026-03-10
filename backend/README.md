# Backend storage

This backend uses Postgres for round storage.

Required env vars:
- DATABASE_URL
- AUTH_USERNAME
- AUTH_PASSWORD
- JWT_SECRET

Optional env vars:
- CORS_ORIGIN
- JWT_TTL_SECONDS

Scripts:
- `npm run dev`: start the API server with TypeScript via `tsx`
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run the compiled server

On first request, the API creates the `rounds` table if it does not exist.
