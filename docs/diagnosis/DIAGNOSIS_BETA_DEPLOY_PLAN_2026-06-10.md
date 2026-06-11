# FrameSpark Diagnosis Beta Server Deployment Plan

Date: 2026-06-10
Reviewed: 2026-06-11
Status: archived deployment plan; not deployment approval

## Deployment Boundary

- Keep the public `/diagnosis/` page frozen and upload-disabled.
- Expose the invitation Beta only at `/diagnosis/beta/` after Basic Auth is active.
- Protect `/api/diagnosis/` and `/api/diagnosis-feedback/` with the same authentication boundary.
- Do not expose `/health`, `/ready`, dev tools, source code, data, logs, or env files publicly.
- Deployment approval, invitation distribution, and MVP opening remain separate decisions.

## Release Candidate Rule

Do not permanently pin a historical short commit in operational instructions. Before every server precheck or deployment:

1. Run `git fetch origin main` locally.
2. Require a clean worktree and `HEAD` equal to `origin/main`.
3. Record the full 40-character SHA as the deployment candidate.
4. If `origin/main` changes after review, stop and review the new diff before building a release.

The reviewed snapshot on 2026-06-11 was:

`5d12fb7c064e0d0a57bb4d8cfb60cbf2cd166cac`

This value is evidence for this review only, not a permanent deployment target.

## Server Layout

- Releases: `/srv/framespark/diagnosis-api/releases/<full-commit-sha>`
- Active release: `/srv/framespark/diagnosis-api/current` as an atomic symlink
- Environment: `/etc/framespark/diagnosis-api.env`, mode `0600`
- Writable data: `/var/lib/framespark-diagnosis/`
- Service user/group: dedicated no-login `framespark-diagnosis`
- Runtime bind: `127.0.0.1:8788`; analytics remains on `127.0.0.1:8787`
- Logs: journald metadata and error codes only; no complete material, report, provider response, or key

Code, Beta assets, data, env files, and logs must not be copied into `/www/wwwroot/framespark.cn`. `/tmp` must not be used as the production release or data directory.

## Systemd Plan

- Service: `framespark-diagnosis.service`
- Working directory: `/srv/framespark/diagnosis-api/current`
- Environment file: `/etc/framespark/diagnosis-api.env`
- Start command: the verified absolute npm path followed by `npm start`
- Restart: `on-failure`, with bounded start and stop timeouts
- Readiness: local `http://127.0.0.1:8788/ready`; liveness: local `/health`
- Hardening: no new privileges, private temp, protected system/home, restricted address families, and write access only to the data directory

The installer writes a unit, reloads systemd, enables the unit, and starts the service. It is never a read-only dry-run command.

## Nginx Plan

- Audit the active `framespark.cn` HTTPS server block before editing it.
- Preserve the existing public `/diagnosis/` and `/api/analytics/` locations.
- Serve `/diagnosis/beta/` from the release `beta-site/` directory through an authenticated alias; allow only static GET/HEAD behavior.
- Protect `/api/diagnosis/` and `/api/diagnosis-feedback/` with the same Basic Auth file and allow only required POST requests.
- Proxy diagnosis to `http://127.0.0.1:8788/api/diagnosis/`.
- Set diagnosis body limit to `5m`, read/send timeout to `240s`, and keep the application deadline at `210s`.
- Overwrite `X-Framespark-Beta-User` with `$remote_user` and forwarding IP headers with server-derived values.
- Keep application Origin/CORS enforcement restricted to `https://framespark.cn`; treat Basic Auth as the primary non-browser access boundary.
- Do not proxy `/health`, `/ready`, or dev endpoints.
- Back up the confirmed site configuration and require `nginx -t` before any future reload.

The repository Nginx script is an audit/snippet generator and deliberately exits without editing the server configuration.

## Required Production Environment

- `NODE_ENV=production`
- `HOST=127.0.0.1`, `PORT=8788`
- `DEEPSEEK_API_KEY` and approved DeepSeek base URL/model
- `ENABLE_DIAGNOSIS_V1=true`
- `ENABLE_V1_STAGED_RUNNER=true`
- `ENABLE_V1_REAL_PROMPTS=true`
- `ENABLE_DEV_TOOLS=false`
- `FAIL_CLOSED_ON_V1_ERROR=true`
- `REQUIRE_BETA_IDENTITY=true`
- `TRUST_PROXY=loopback`
- `ALLOWED_ORIGINS=https://framespark.cn`
- Upload, DOCX expansion, text, request timeout, retention, provider-call, account/IP/global and concurrency limits from the reviewed production baseline

Never print, commit, upload with the release archive, or copy the production env into the webroot.

## Safe Execution Order

1. Complete legal review, credential ownership, real-AI budget approval, rollback window, and server configuration review.
2. Fetch and lock the current reviewed `origin/main` full SHA; run the complete no-AI suite locally.
3. Build and checksum a versioned release from that exact commit, then install production dependencies inside the release directory.
4. Run no-AI checks before making the release immutable and switching `current`.
5. Prepare the dedicated user, data directory, secure env and previous-release record.
6. Install and start systemd while no public Nginx diagnosis locations exist; verify local health/readiness.
7. Verify invalid input, missing identity, limits, public DTO and fail-closed behavior without provider calls.
8. Create and review independent Basic Auth credentials, audit the active Nginx configuration, back it up, add all three protected locations together, run `nginx -t`, then reload.
9. Verify anonymous authentication challenges and authenticated Beta/API behavior without exposing internal fields.
10. Only after separate approval, run one fictional real-AI production smoke and inspect redacted logs and provider-call counts.

## Rollback

1. Disable or deny all three Beta locations first.
2. Test and reload Nginx.
3. Atomically repoint `current` to the recorded previous release.
4. Restart `framespark-diagnosis.service` and verify local readiness.
5. Verify the public website and `/api/analytics/` remain unaffected.
6. Preserve the env and required metadata logs; do not create or retain full material/report logs outside the approved retention process.

## Deployment Blockers

Do not deploy or open the Beta until legal review, Basic Auth ownership, secure env handling, systemd/Nginx review, full no-AI tests, production smoke approval, log verification, provider budget confirmation and rollback rehearsal are complete.
