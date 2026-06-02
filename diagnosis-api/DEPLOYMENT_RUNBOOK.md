# Diagnosis API Deployment Runbook

## Purpose

This is a manual runbook for production connection of `diagnosis-api`. It is not an automatic deployment script. Do not reopen the public diagnosis upload entry while following this runbook.

## Current production constraints

- `analytics-api` already uses `127.0.0.1:8787`.
- `diagnosis-api` should use `127.0.0.1:8788`.
- `ENABLE_DIAGNOSIS_V1` must remain `false`.
- The public `/diagnosis/` page remains internal-test / public-upload-disabled.

## Required env

Use an environment file outside the repository, for example `/home/ubuntu/framespark-diagnosis.env`.

- `HOST=127.0.0.1`
- `PORT=8788`
- `DEEPSEEK_API_KEY=` production required; never commit it to Git.
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `AI_TIMEOUT_MS=90000`
- `MAX_UPLOAD_MB=10`
- `MIN_TEXT_CHARS=800`
- `MAX_TEXT_CHARS=80000`
- `ENABLE_DIAGNOSIS_V1=false`
- `ENABLE_DEV_TOOLS=false`
- `DIAGNOSIS_DAILY_LIMIT=`
- `DIAGNOSIS_FEEDBACK_DAILY_LIMIT=`

## Preflight checks

- Local `main` and `origin/main` are in sync.
- SSH to the Tencent Cloud server works.
- Port `8788` is free.
- Port `8787` is still used by `analytics-api`.
- `/tmp/framespark-site` exists on the server.
- `diagnosis-api` dependencies are installed.
- `/home/ubuntu/framespark-diagnosis.env` exists and is not in Git.
- Public upload controls are still disabled.

## systemd plan

- Service name: `framespark-diagnosis.service`
- User: `ubuntu`
- Working directory: `/tmp/framespark-site/diagnosis-api`
- Env file: `/home/ubuntu/framespark-diagnosis.env`
- Command: `npm start`
- Restart: `always`
- Logs: `journalctl -u framespark-diagnosis.service -n 100 --no-pager`

Do not write or install the service until the preflight checks pass.

## Nginx proxy plan

- Path: `/api/diagnosis/`
- Proxy target: `http://127.0.0.1:8788/api/diagnosis/`
- `client_max_body_size` should match `MAX_UPLOAD_MB=10`.
- `proxy_read_timeout` must allow AI request latency.
- Keep `/api/analytics/` separate and unchanged.
- Run `nginx -t` first. Reload only after config test passes.

Do not add the proxy until the local service health check passes.

## Verification plan

- Local health: `curl -s http://127.0.0.1:8788/health`
- Confirm the available HTTPS API path before public testing.
- Do not test with real user materials.
- Prefer dry, mock, and rate-limit checks before any real AI smoke test.
- Confirm `/api/diagnosis` returns JSON and no longer falls through to static HTML.

## Stop conditions

Stop if any of these happen:

- Port `8788` is occupied.
- Env is missing `DEEPSEEK_API_KEY`.
- Local health does not pass.
- `nginx -t` fails.
- `/api/diagnosis` returns HTML.
- The fix requires changing high-risk business files.
- The fix requires restoring the public upload entry.
- PDF support and public copy are not aligned.

## Public upload restore gates

Only restore public upload controls after all are true:

- `diagnosis-api` is running.
- Health check is OK.
- Nginx proxy is OK.
- POST smoke test is OK.
- Rate limit is OK.
- Error copy is understandable.
- Privacy and upload copy are OK.
- PDF support is implemented, or the page copy is narrowed to TXT/DOCX/paste.
