# Golf Stat Tracker

This repo is now split into two independent deployable projects:

- `frontend/` (React + Vite)
- `backend/` (Node API, deployable as Vercel serverless function)

## Local development

Install dependencies per project:

```bash
cd frontend && npm install
cd ../backend && npm install
```

Run in two terminals:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

The frontend uses:
- `VITE_API_BASE_URL` (defaults to `http://localhost:3001`)
- `VITE_GOOGLE_MAPS_API_KEY` (required to render the Google Maps prototype)
- `VITE_GOOGLE_MAPS_MAP_ID` (required for map rotation)

## Deploy to Vercel (separate projects)

1. Create one Vercel project rooted at `backend/`.
1. Set backend env vars:
   - `DATABASE_URL=<your-postgres-connection-string>`
   - `CORS_ORIGIN=https://<your-frontend-domain>`
   - `AUTH_USERNAME=<your-username>`
   - `AUTH_PASSWORD=<your-strong-password>`
   - `JWT_SECRET=<long-random-secret>`
   - Optional: `GOOGLE_CLIENT_ID=<your-google-oauth-web-client-id>`
   - Optional: `JWT_TTL_SECONDS=604800`
1. Deploy and copy backend URL (for example `https://golf-stats-api.vercel.app`).
1. Create another Vercel project rooted at `frontend/`.
1. Set frontend env var:
   - `VITE_API_BASE_URL=https://<your-backend-domain>`
   - Optional: `VITE_GOOGLE_CLIENT_ID=<your-google-oauth-web-client-id>`
   - `VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-js-api-key>`
   - `VITE_GOOGLE_MAPS_MAP_ID=<your-google-maps-map-id>`
1. Redeploy frontend.

## Important persistence note

`backend/` now stores rounds in Postgres via `DATABASE_URL`. This is durable and suitable for Vercel serverless deployments.

## API endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/users`
- `GET /api/me`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `GET /api/rounds`
- `POST /api/rounds`
- `GET /api/rounds/:id`
- `PUT /api/rounds/:id`
