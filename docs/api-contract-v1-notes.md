# API Contract v1 Notes

This note accompanies [openapi-v1.yaml](/Users/richardaspinall/Developer/projects/golf-stats/docs/openapi-v1.yaml).

## Goal

Freeze the backend boundary the web app already uses, then harden it so iOS and web can share the same contract without each client compensating for backend quirks.

## Current contract risks

- Some success responses were normalized in this pass, but the API should still be reviewed endpoint-by-endpoint before calling the contract fully frozen.
- The web client still sanitizes and normalizes several server payloads after fetch, which means the backend is not yet the sole source of truth.
- `POST /api/users` still exists in the client surface but is hard-disabled by the backend.
- Several request fields are technically optional because the backend fills defaults, but those defaults are not yet documented as first-class compatibility guarantees.
- Internal/debug endpoints such as `/api/debug/db` are not treated as part of the public mobile contract yet.

## Recommended hardening before iOS depends on v1

1. Finish normalizing all success responses to one envelope shape.
2. Move validation and normalization fully into the backend contract and remove mirrored cleanup from the web client.
3. Add contract tests that assert response bodies for every documented endpoint.
4. Decide versioning rules now:
   - additive fields are allowed in `v1`
   - field removals or type changes require `v2`
   - auth and error envelopes are part of the stable contract

## Suggested next implementation step

Use this draft as the source document for a backend normalization pass, then add endpoint-level tests that assert the documented shapes exactly.
