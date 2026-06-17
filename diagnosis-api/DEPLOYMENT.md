# Diagnosis API Invite Beta Deployment Plan

This repository contains the production baseline only. It does not authorize deployment or public access. Read `DEPLOYMENT_RUNBOOK.md` before any server change.

## Runtime

- Service: `framespark-diagnosis.service`
- User/group: dedicated no-login `framespark-diagnosis`
- Releases: `/srv/framespark/diagnosis-api/releases/<commit>`
- Current release: `/srv/framespark/diagnosis-api/current`
- Env: `/etc/framespark/diagnosis-api.env`, mode `0600`
- Writable data: `/var/lib/framespark-diagnosis`
- Bind: `127.0.0.1:8788`; analytics remains on `8787`
- Start: `npm start`

Production dependencies for native modules must be built outside the production
server in a Linux environment matching the target Node 20 platform/architecture,
then uploaded as an immutable release artifact that already contains
`node_modules`. The production server should only verify, unpack, freeze
permissions and switch `current`; it must not run full `npm ci` or native
compilation during Phase 3.

Production startup fails unless the DeepSeek key, all three V1 switches, fail-closed behavior, Beta identity enforcement, loopback binding, port `8788`, allowed origin and external data directory are valid.

## Access-code Phase 1 Boundary

- The repository contains an optional SQLite access-code/session foundation.
- `ENABLE_BETA_CODE_ACCESS=false` remains the production default for this phase.
- Do not add HMAC keys, create the database, generate real codes or change Nginx until the homepage and cookie-auth migration receive separate approval.
- When enabled later, the database must be `/var/lib/framespark-diagnosis/access/beta-access.sqlite`, a regular service-owned `0600` file outside webroot.
- Code and session HMAC keys must be distinct random secrets of at least 32 bytes. Rotating the code key invalidates codes; rotating the session key invalidates active sessions.
- `better-sqlite3@12.10.1` is native. Every production candidate must pass install, audit, native load and no-AI checks in a Linux Node 20 build environment compatible with production.
- Diagnosis-api-only server artifacts use `npm run test:server-release` with an isolated `DIAGNOSIS_DATA_DIR` before upload. Frontend access-code tests require the repository root static files and are validated before static-site or Beta-client deployment, not inside the backend-only release.
- Phase 3 retry 2 showed that production-host `npm ci` can destabilize the instance. Do not repeat production-host native dependency builds unless a separate maintenance-window fallback plan explicitly approves resource limits and timeout supervision.

## Invite Beta Boundary

- Keep public `/diagnosis/` as the upload-disabled preview.
- Keep Beta source under `diagnosis-api/beta-site/`, outside the static webroot and existing public-site rsync scope.
- Protect `/diagnosis/beta/`, `/api/diagnosis/` and `/api/diagnosis-feedback/` with Nginx Basic Auth.
- Nginx must overwrite `X-Framespark-Beta-User` with `$remote_user`.
- Nginx must overwrite `X-Forwarded-For` with `$remote_addr`; do not preserve a client-supplied forwarding chain.
- Do not expose `/health` or `/ready` publicly; use them from localhost.
- Do not enable `ENABLE_DEV_TOOLS` in production.

## Limits

- File: TXT/DOCX only, 5 MB compressed, 20 MB DOCX expansion ceiling.
- Text: 20,000 non-whitespace characters maximum; short or low-information material can return D0.
- Request deadline: 210 seconds; Nginx read timeout: 240 seconds.
- Per diagnosis: at most five provider calls, including one shared normal repair and one final safety repair.
- Initial Beta quota: account 3/day, IP 6/day, global 20 diagnoses/day, global 100 provider calls/day, concurrency 2.

## Data Handling

- Default logs contain metadata only and expire after 30 days.
- Original filename, full material and full report are not saved by default.
- Explicit human-review consent allows access-controlled host storage outside the webroot for at most 14 days.
- Logs and API responses must not contain API keys, raw provider responses or internal diagnostics.

## Reverse Proxy

- API target: `http://127.0.0.1:8788/api/diagnosis/`
- Feedback target: `http://127.0.0.1:8788/api/diagnosis-feedback/`
- `client_max_body_size 5m`
- `proxy_read_timeout 240s`
- Keep `/api/analytics/` separate and unchanged.
- Serve `/diagnosis/beta/` from `/srv/framespark/diagnosis-api/current/beta-site/` with an authenticated Nginx `alias`; never copy it into `/www/wwwroot/framespark.cn/diagnosis/` before protection exists.
- Review `scripts/install-diagnosis-nginx-proxy.sh`; it prints a snippet and never blind-edits Nginx.

## Open Gates

Do not deploy or enable the Beta page until local tests, legal review, service installation, authenticated proxy, readiness, rate limits, metadata-only logging, rollback and 1-3 fictional production smoke runs pass.
