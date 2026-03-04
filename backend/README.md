# Backend storage

This backend uses Postgres for round storage.

Required env vars:
- DATABASE_URL
- AUTH_USERNAME
- AUTH_PASSWORD
- JWT_SECRET

On first request, the API creates the `rounds` table if it does not exist.
