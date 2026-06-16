# Diagnosis API Invite Beta Runbook

## Purpose

Manual runbook for a protected diagnosis Beta. It is not an automatic deployment instruction and does not authorize public upload.

## Preflight

- Approved commit is on `origin/main`; worktree is clean.
- Node/npm are available and `127.0.0.1:8788` is free; analytics still owns `8787`.
- Dedicated no-login user `framespark-diagnosis` exists.
- Release directory exists at `/srv/framespark/diagnosis-api/releases/<commit>` and `current` points to it.
- `/etc/framespark/diagnosis-api.env` exists with mode `0600`.
- `/var/lib/framespark-diagnosis` is owned by the service user and is not under the webroot.
- Basic Auth file `/etc/nginx/framespark-diagnosis-beta.htpasswd` exists outside Git.
- Beta source exists at `/srv/framespark/diagnosis-api/current/beta-site/` and is not present in the public static webroot.
- Public `/diagnosis/` still contains no upload control or API reference.

## Required Production Env

- `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=8788`
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`
- `ENABLE_DIAGNOSIS_V1=true`
- `ENABLE_V1_STAGED_RUNNER=true`
- `ENABLE_V1_REAL_PROMPTS=true`
- `ENABLE_DEV_TOOLS=false`
- `FAIL_CLOSED_ON_V1_ERROR=true`
- `REQUIRE_BETA_IDENTITY=true`
- `ALLOWED_ORIGINS=https://framespark.cn`, `TRUST_PROXY=loopback`
- `MAX_UPLOAD_MB=5`, `MAX_DOCX_EXPANDED_MB=20`, `MAX_TEXT_CHARS=20000`
- `AI_TIMEOUT_MS=90000`, `REQUEST_TIMEOUT_MS=210000`
- `DIAGNOSIS_DATA_DIR=/var/lib/framespark-diagnosis`
- Retention, account/IP/global/provider/concurrency limits from `.env.example`

Never print or commit the env file.

Phase 1 access-code variables remain disabled and secret-free in production. A later migration must create two distinct HMAC secrets through the approved root-only env process and must not generate real codes before cookie authentication and rollback have been reviewed.

## Installation Order

1. Create `/srv/framespark/diagnosis-api/releases/<commit>`, install dependencies there with `npm ci --omit=dev`, and run the full no-AI suite before treating the release as immutable.
   - Confirm `npm ls better-sqlite3` resolves exactly `12.10.1` and `npm audit --omit=dev` reports zero vulnerabilities.
   - For a diagnosis-api-only server release, run `DIAGNOSIS_DATA_DIR=<isolated-var-tmp-test-dir> npm run test:server-release` without a provider key.
   - Do not run `npm run test:beta-access-frontend` inside a diagnosis-api-only server release; it requires the repository root static site files and belongs to complete-repository or static-deployment validation.
2. Confirm the prepared release contains `package-lock.json` and `node_modules`, then atomically point `current` to it; do not install dependencies through the `current` link.
3. Review, then run `install-diagnosis-systemd.sh`; it only verifies the prepared release and installs the service definition. Confirm `/health` and `/ready` locally.
4. Run `install-diagnosis-nginx-proxy.sh` as an audit only. It reports each Beta/API location as present or missing and never edits Nginx.
5. Confirm the active site-config path, back it up manually, compare every existing location with the canonical snippet, and add only missing locations without changing analytics.
6. Run the panel Nginx config test. Reload only after it passes.
7. Add the authenticated Nginx alias from `/diagnosis/beta/` to the release's `beta-site/`; never copy these files into the public webroot.
8. Verify anonymous access receives authentication and authenticated access serves the Beta page/API.

## Verification

- Local: `/health` returns liveness; `/ready` returns HTTP 200.
- Public preview remains closed; Beta page requires authentication.
- Unsupported files, oversized files, overlong text, bad origin and missing Beta identity fail before AI.
- A client-supplied `X-Forwarded-For` value cannot change the API's effective IP because Nginx overwrites it.
- D0 returns a user result rather than an internal error for low-information material.
- Public success JSON contains no `reportV1`, model, prompt version, latency, retry or fallback fields.
- A final unsafe result returns controlled failure and no legacy report.
- Metadata logs contain no original filename, full material or full report.
- Run 1-3 fictional production smoke cases only after explicit real-AI approval.

## Rollback

1. Disable all three Beta Nginx locations (`/diagnosis/beta/`, `/api/diagnosis/`, `/api/diagnosis-feedback/`) or block their authentication access first.
2. Test and reload Nginx.
3. Point `/srv/framespark/diagnosis-api/current` to the previous release.
4. Restart `framespark-diagnosis.service` and verify local readiness.
5. Preserve env and data; do not delete review-consent records outside the retention process.

## Stop Conditions

Stop on failed tests, missing env/auth, occupied port, readiness failure, Nginx test failure, HTML from the API, internal fields in public JSON, full content in default logs, unexpected provider-call count, fallback exposure, or any need to open the unprotected public page.
