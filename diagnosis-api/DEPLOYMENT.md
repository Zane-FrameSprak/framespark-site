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

Install production dependencies inside the versioned release before promoting the `current` symlink. The systemd installer only verifies the prepared release and must not mutate it through `current`.

Production startup fails unless the DeepSeek key, all three V1 switches, fail-closed behavior, Beta identity enforcement, loopback binding, port `8788`, allowed origin and external data directory are valid.

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
