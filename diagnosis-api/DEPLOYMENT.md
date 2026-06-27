# Diagnosis API Beta Deployment Plan

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

Current production backend release in the handoff docs is
`8e089c5bcf68086c787a3cafc58ba358d92e1ee1`. Invite-code Beta is live in
production until the public-beta release is deployed. The repository now also
supports anonymous public beta sessions through `ENABLE_PUBLIC_BETA_ACCESS`,
but that switch requires a new immutable release, env update, Nginx route
review, static asset deploy and no-AI boundary verification before production
traffic can use it. B4 T0 has not started.

The previous `d722fc3...` artifact must not be reused for Phase 4B. Its
`better-sqlite3` native module was built against a newer glibc than production
and failed to load when Beta access schema initialization was attempted. The
current `e16d699...` release was built from the fixed `ubuntu-22.04` workflow
and verified on the production server before deployment.

Production dependencies for native modules must be built outside the production
server in a Linux environment matching the target Node 20 platform/architecture,
then uploaded as an immutable release artifact that already contains
`node_modules`. The production server should only verify, unpack, freeze
permissions and switch `current`; it must not run full `npm ci` or native
compilation during Phase 3.

First use the manual GitHub Actions workflow
`Build Diagnosis API release artifact` to create the tarball, manifest and
`SHA256SUMS` on the fixed `ubuntu-22.04` Linux Node 20 runner. The workflow
uses no production secrets and does not deploy. Use
`scripts/verify-server-release-artifact.sh` later in server staging to verify
the downloaded artifact without `npm ci`, network access, env changes,
`current` changes or service restarts. The manifest and verifier must prove the
artifact glibc is not newer than production glibc.

Production startup fails unless the DeepSeek key, all three V1 switches, fail-closed behavior, Beta identity enforcement, loopback binding, port `8788`, allowed origin and external data directory are valid.

## Access Boundary

- The repository contains a SQLite access-code/session foundation and a
  separate signed anonymous public-session path.
- `ENABLE_BETA_CODE_ACCESS=true` exposes `POST /api/beta-access/verify` for
  invite-code cohorts.
- `ENABLE_PUBLIC_BETA_ACCESS=true` exposes
  `POST /api/beta-access/public-session` for public beta without creating user
  accounts or real access codes.
- Do not enable public beta without the hardened limits: account/session `1`,
  IP `3`, global diagnoses `5`, provider daily `30`, concurrency `1`, provider
  calls per diagnosis `5`.
- When enabled later, the database must be `/var/lib/framespark-diagnosis/access/beta-access.sqlite`, a regular service-owned `0600` file outside webroot.
- Code and session HMAC keys must be distinct random secrets of at least 32 bytes. Rotating the code key invalidates codes; rotating the session key invalidates active sessions.
- `better-sqlite3@12.10.1` is native. Every production candidate must pass install, audit, native load and no-AI checks in a Linux Node 20 build environment compatible with production.
- Diagnosis-api-only server artifacts use `npm run test:server-release` with an isolated `DIAGNOSIS_DATA_DIR` before upload. Frontend access-code tests require the repository root static files and are validated before static-site or Beta-client deployment, not inside the backend-only release.
- Phase 3 retry 2 showed that production-host `npm ci` can destabilize the instance. Do not repeat production-host native dependency builds unless a separate maintenance-window fallback plan explicitly approves resource limits and timeout supervision.
- `scripts/build-server-release.docker.example.sh` documents the recommended Docker `linux/amd64` Node 20 build flow and writes artifacts outside the repository by default.

## Beta Boundary

- Public `/diagnosis/` may remain an explanatory page; the functional Beta UI
  is `/diagnosis/beta/`.
- Keep Beta source under `diagnosis-api/beta-site/`, outside the static webroot and existing public-site rsync scope.
- Protect `/diagnosis/beta/` and `/api/diagnosis/` through the backend Cookie
  session boundary. Basic Auth files may remain for rollback but must not be
  the ordinary public-beta user experience.
- Feedback remains closed unless a separate plan opens it.
- Nginx must clear any client-supplied `X-Framespark-Beta-User`; the backend
  derives identity from the page/API Cookie session.
- Nginx must overwrite `X-Forwarded-For` with `$remote_addr`; do not preserve a client-supplied forwarding chain.
- Do not expose `/health` or `/ready` publicly; use them from localhost.
- Do not enable `ENABLE_DEV_TOOLS` in production.

## Limits

- File: TXT/DOCX only, 5 MB compressed, 20 MB DOCX expansion ceiling.
- Text: 50,000 `cl100k_base` tokens maximum via `MAX_INPUT_TOKENS`; short or low-information material can return D0.
- Request deadline: 210 seconds; Nginx read timeout: 240 seconds.
- Per diagnosis: at most five provider calls, including one shared normal repair and one final safety repair.
- Initial public beta quota: account/session 1/day, IP 3/day, global 5 diagnoses/day, global 30 provider calls/day, global 5,000,000 provider tokens/day, concurrency 1.

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

Do not start B4 T0, raise limits, open feedback, add a user system, or run a
real production Diagnosis POST until the public-beta backend/static/Nginx
deployment has passed no-AI verification and a separate real-AI smoke decision
is made.
