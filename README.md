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

## Deploy to Vercel (separate projects)

1. Create one Vercel project rooted at `backend/`.
1. Set backend env vars:
   - `CORS_ORIGIN=https://<your-frontend-domain>`
   - Optional: `DATA_FILE=/tmp/golf-stats.json` (default on Vercel)
1. Deploy and copy backend URL (for example `https://golf-stats-api.vercel.app`).
1. Create another Vercel project rooted at `frontend/`.
1. Set frontend env var:
   - `VITE_API_BASE_URL=https://<your-backend-domain>`
1. Redeploy frontend.

## Important persistence note

`backend/` currently writes to a JSON file. On Vercel serverless this is ephemeral (`/tmp`) and not durable across cold starts or instance changes. For production persistence, move storage to a database (for example Postgres, Neon, Supabase, or Vercel KV).

## API endpoints

- `GET /api/health`
- `GET /api/rounds`
- `POST /api/rounds`
- `GET /api/rounds/:id`
- `PUT /api/rounds/:id`
