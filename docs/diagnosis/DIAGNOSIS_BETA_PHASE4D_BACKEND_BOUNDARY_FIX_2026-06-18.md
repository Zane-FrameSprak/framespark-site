# Diagnosis Beta Phase 4D Backend Boundary Fix

Date: 2026-06-18

## Summary

The previous Phase 4D Nginx `auth_request` design is not usable on the current
production Nginx build. This repository change moves the invite-code session
boundary into the Diagnosis API backend so a later Nginx phase can use exact
reverse-proxy routes without requiring `auth_request`.

No production server, Nginx, env, SQLite, access code, Diagnosis POST, AI call,
static deployment or B4 T0 action occurred in this step.

## Backend Changes

- When `ENABLE_BETA_CODE_ACCESS=true`, the Diagnosis API can now serve only the
  exact Beta static routes:
  - `GET/HEAD /diagnosis/beta/`
  - `GET/HEAD /diagnosis/beta/app.js`
  - `GET/HEAD /diagnosis/beta/beta.css`
- Those routes require the page-scoped invite-code session cookie.
- Missing, invalid, revoked or wrong-scope page sessions redirect to
  `/#diagnosis-beta-entry`.
- Unknown `/diagnosis/beta` or `/diagnosis/beta/*` paths remain 404.
- `POST /api/diagnosis/` can now derive the stable Beta identity from the
  API-scoped invite-code session cookie before the existing Beta identity guard.
- The existing Basic Auth identity-header path remains compatible for the
  current production boundary and rollback path.

## Test Coverage

Updated `test:beta-access` now covers:

- verify API strict origin and generic invalid errors
- scoped page/API cookies
- protected backend-served Beta static files
- API cookie identity on a missing-material no-AI Diagnosis POST
- wrong-scope cookie rejection
- revocation invalidating page and API sessions
- provider request count remains zero

Additional unchanged checks:

- `test:beta-access-frontend` still covers homepage state, privacy boundaries
  and Beta client session-expiry redirect behavior.
- `test:no-ai` still covers the full no-AI regression set.

## Remaining Phase 4D Work

This commit does not launch invite-code access. The next Phase 4D deployment
strategy must still:

- build and deploy a new Diagnosis API release artifact
- deploy the homepage invite-code static assets
- deploy the updated Beta static assets if Nginx does not proxy them to the
  backend directly
- modify Nginx only with exact proxy routes, no `auth_request`
- clear client-supplied trusted identity headers before proxying
- prevent Cookie logging in invite-code locations, most likely with
  location-level logging controls rather than panel-managed global log-format
  edits
- keep `/health`, `/ready`, `/internal/*`, feedback and unknown API subpaths
  private
- use only no-AI validation until a separate B4/T0 or real tester step is
  explicitly approved

## Stop Status

Repository code is ready for the next artifact build and server-side Phase 4D
planning pass. Production still remains on the existing Basic Auth public Beta
boundary until a separate deployment step succeeds.
