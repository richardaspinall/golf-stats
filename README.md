# Golf Stat Tracker

React + Node.js app for tracking golf round stats by hole, including:
- Inside 100
- Out of position (OOP)
- Fairway result (single selection)
- GIR result (single selection)

## Run locally

```bash
npm install
npm run dev
```

This starts:
- Frontend (Vite): `http://localhost:5173`
- Backend API (Node): `http://localhost:3001`

If you prefer separate terminals:

```bash
npm run dev:api
npm run dev:app
```

## Rounds

- You can create named rounds.
- You can switch between rounds from the round selector.
- Changes auto-save to the currently selected round.

## Backend persistence

Data is stored in:
- `data/stats.json`

API endpoints:
- `GET /api/health`
- `GET /api/rounds`
- `POST /api/rounds`
- `GET /api/rounds/:id`
- `PUT /api/rounds/:id`

In development, Vite proxies `/api/*` to `http://localhost:3001`.
