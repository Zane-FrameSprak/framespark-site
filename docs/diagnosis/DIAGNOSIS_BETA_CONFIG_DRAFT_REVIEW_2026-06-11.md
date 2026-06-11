# Diagnosis Beta Deployment Configuration Draft Review

Date: 2026-06-11
Status: repository draft review only; no deployment approval

## Reviewed Baseline

After `git fetch origin main`, the clean local worktree and `origin/main` both resolved to:

`59a838eb53d0f1380db025a3c7b0a496b2073508`

This SHA identifies the baseline used to create the drafts. A future review or deployment must fetch again and lock the then-current full SHA.

## Draft Files

- `deploy/diagnosis-beta/framespark-diagnosis.service.draft`
- `deploy/diagnosis-beta/nginx-diagnosis-beta.locations.draft`
- `deploy/diagnosis-beta/diagnosis-api.env.example`
- `deploy/diagnosis-beta/deploy-commands.draft.sh`
- `deploy/diagnosis-beta/rollback-commands.draft.sh`

The shell drafts contain an unconditional `exit 64`. They are review material and cannot execute their command bodies unless a separately approved task deliberately removes that guard.

## Drafts That Can Continue to Review

- The systemd draft uses `framespark-diagnosis`, `/srv/framespark/diagnosis-api/current`, `/etc/framespark/diagnosis-api.env`, `/usr/bin/npm`, loopback `8788`, `Restart=on-failure`, local readiness and a read-only release with one external writable data directory.
- The systemd hardening matches the existing runtime needs without using `MemoryDenyWriteExecute`, which could interfere with Node/V8.
- The Nginx fragment leaves public `/diagnosis/` and `/api/analytics/` unchanged, denies the no-trailing-slash Beta path, and protects all three Beta locations with the same Basic Auth file.
- `location ^~ /diagnosis/beta/` takes precedence over the existing static-resource regex location. Static access is limited to GET/HEAD behavior; both APIs allow POST only.
- The diagnosis API draft uses a 5 MB body limit and 240-second proxy timeout, forwards server-derived identity/IP values, and never proxies health/readiness.
- The env example contains placeholders and the approved production V1, fail-closed, identity, upload, timeout, retention and quota values.
- The deployment draft requires a fresh fetch, clean worktree, exact full-SHA match, archive checksum, versioned release, no-AI tests, secure env installation and local health/readiness before Nginx review.
- The deployment draft rejects an env file that still contains `DEEPSEEK_API_KEY=REPLACE_ME` without printing the env content.
- The rollback draft closes the three Beta routes first by restoring a reviewed pre-Beta configuration, validates the expected current config checksum, tests/reloads Nginx, then switches release and restarts the service.

## Mandatory Human Confirmation

- Confirm the final service unit with `systemd-analyze verify` and verify that `EnvironmentFile` plus explicit HOST/PORT produce the expected effective environment.
- Confirm the service user, release ownership and `ProtectSystem=strict` allow Node/npm to read all runtime files while only `/var/lib/framespark-diagnosis` remains writable.
- Decide the production Basic Auth file owner/group and restrictive mode so the actual Nginx worker can read it without making it generally readable.
- Review `disable_symlinks` behavior with the root-owned `current` release symlink and Nginx alias on the production build.
- Confirm that returning 404 for `/diagnosis/beta` without a trailing slash is the intended product behavior.
- Confirm application-level Origin handling. The Nginx fragment forwards Origin and deliberately does not emit wildcard CORS headers; Basic Auth remains the primary access boundary.
- Confirm the active site config has not changed after the read-only precheck and that all three locations are merged into the HTTPS server block together.
- Confirm legal approval, credential ownership, provider budget, maintenance window, previous-release SHA and rollback operator before any server action.

## Env Contract Caveat

`BETA_IDENTITY_HEADER` and `LOG_REDACTION_REQUIRED` are included to make the deployment contract explicit. The current application does not dynamically read those two env names:

- The trusted header is currently fixed as `X-Framespark-Beta-User` in application middleware.
- Metadata-only logging is implemented in application behavior and tests rather than enabled by a runtime env switch.

These entries must not be treated as independent runtime enforcement. Changing either contract requires a separate business-code plan and tests.

## Commands That Must Never Be Pasted Directly

- The complete bodies of `deploy-commands.draft.sh` and `rollback-commands.draft.sh`.
- User creation, directory creation, ownership/permission, env installation, release promotion, systemd enable/start/restart, Nginx config replacement or reload commands.
- Any command containing placeholder host, SHA, secure source, config checksum, previous release or credential path.
- Any command that creates Basic Auth credentials, writes a real API key, calls the diagnosis API, or runs a real-AI smoke without separate authorization.

Before execution, an approved operator must convert the relevant subset into a new reviewed runbook with exact values, explicit stop points and server-state verification. The draft scripts themselves must remain non-executable review artifacts.

## Risks Still Open

- Incorrect auth-file permissions could either prevent Nginx startup or expose credential hashes.
- A partial Nginx merge could leave one API unprotected or shadow the existing analytics/static locations.
- Restoring an old full Nginx backup could overwrite unrelated changes; the rollback checksum gate must match before restoration.
- Production counters other than the provider cap are single-process and reset on service restart; this remains acceptable only for a small invitation Beta.
- `DEEPSEEK_API_KEY=REPLACE_ME` is a placeholder, not a valid production value. Production readiness must reject an absent or invalid secure env before service exposure.
- Passing syntax checks proves only that the drafts parse; it does not prove server compatibility or authorize deployment.

## Next-stage Decision

The repository may proceed to **deployment configuration draft review**. Reviewers may inspect and revise these draft files, but they must not connect to the server, apply configuration, create credentials, start services, reload Nginx, run real AI, or open Beta/API routes.

Actual server preparation remains blocked until all mandatory human confirmations are resolved and a separate execution task is explicitly approved.
