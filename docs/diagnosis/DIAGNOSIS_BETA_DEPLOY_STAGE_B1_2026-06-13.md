# Diagnosis Beta Deployment Stage B1

Date: 2026-06-13

## Scope

Stage B1 opened only the invitation-protected Beta page and the exact Diagnosis API endpoint. It did not enable feedback, health, readiness, public Diagnosis uploads, a real-AI smoke or Stage B2.

## Deployed Boundary

- `/diagnosis/beta/`, `app.js` and `beta.css` use the same Basic Auth boundary.
- The Basic Auth file is outside Git and webroot, is owned by `root:www`, and has mode `0640`. Its content, password and hash were not read or recorded.
- Beta static files are mirrored separately under `/srv/framespark/diagnosis-beta-site/current`; Nginx does not need access to the backend release tree.
- Only exact `POST /api/diagnosis/` is proxied to `127.0.0.1:8788`; Authorization is removed before proxying and the authenticated username is supplied through the reviewed identity header.
- `/api/diagnosis`, unknown Diagnosis API children and unknown Beta assets are rejected. Feedback, health and readiness are not proxied.
- The public `/diagnosis/` page and `/api/analytics/` were not changed.

## Static Index Correction

The initial exact homepage location used a file-level alias while inheriting the server-level `index index.html` directive. Nginx attempted to read `index.htmlindex.html` for the trailing-slash request. The final location rewrites `/diagnosis/beta/` to `/index.html` with `break` and uses the dedicated Beta static root. It does not use `try_files`.

## Verification

- Nginx syntax validation passed before reload.
- Correct credentials returned HTTP 200 for the Beta HTML, `app.js` and `beta.css`.
- Missing and incorrect credentials returned HTTP 401 for protected static resources and the API.
- An authenticated empty-body POST reached the exact API route and returned the expected controlled HTTP 400 without provider use.
- GET on the exact API route returned HTTP 403; an unknown API child returned HTTP 404.
- Feedback remained unopened. Public `/health` and `/ready` continued to resolve through the static-site fallback rather than the Diagnosis backend.
- The public home page and frozen `/diagnosis/` remained HTTP 200. Analytics continued reaching its application endpoint.
- Diagnosis remained `active/disabled`, `NRestarts=0`, with `8788` listening only on `127.0.0.1`.
- Provider-call delta was zero. No real material or real AI request was submitted.
- No password, Authorization value, key, material or complete report was recorded in this document.

## Stop State

Stage B1 is complete. Do not infer Stage B2 authorization, invitation distribution or real-AI smoke approval from this result.
