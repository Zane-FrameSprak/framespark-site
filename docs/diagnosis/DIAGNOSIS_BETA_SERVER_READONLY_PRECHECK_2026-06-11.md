# Diagnosis Beta Server Read-only Precheck

Date: 2026-06-11
Scope: server-state inspection only; no deployment, configuration change, service action, credential read, AI call, or public route opening

## Reviewed Repository Baseline

Immediately before documenting this precheck, `git fetch origin main` confirmed a clean worktree with local `HEAD` and `origin/main` both at:

`efd9b46f6d5d1a566a38e94b796ecac471edf27c`

This SHA records the reviewed documentation baseline only. Any later configuration draft, server preparation, or deployment must fetch again and lock the then-current reviewed full SHA.

## Conditions Already Satisfied

- Server host is `VM-4-9-ubuntu`; the inspection ran as user `ubuntu` from `/home/ubuntu`.
- Server time reported `2026-06-11T09:47:54+08:00`.
- Kernel reported Linux `5.15.0-171-generic` on `x86_64`.
- Node is available at `/usr/bin/node`, version `v20.20.2`.
- npm is available at `/usr/bin/npm`, version `10.8.2`.
- curl is available at `/usr/bin/curl`.
- Port `8788` was not listening during the inspection.
- Analytics continues to listen on `127.0.0.1:8787` through a Node process.
- The active Nginx configuration could be read successfully with `nginx -T`.
- The active `framespark.cn` server block currently contains `/api/analytics/` proxying to `127.0.0.1:8787` and the existing static-site locations only.
- The public webroot contains the frozen static `/diagnosis/index.html`.
- The public webroot does not contain `diagnosis/beta`, `diagnosis-api`, or `internal` directories.

## Missing Conditions

- Dedicated no-login user/group `framespark-diagnosis` does not exist.
- `/srv/framespark` and `/srv/framespark/diagnosis-api` do not exist.
- No `releases/` directory or `current` symlink exists.
- `/etc/framespark` and `/etc/framespark/diagnosis-api.env` do not exist.
- `/var/lib/framespark-diagnosis` does not exist.
- `/etc/nginx/framespark-diagnosis-beta.htpasswd` does not exist.
- `framespark-diagnosis.service` is not installed; systemd reported no unit file.

Because the env, data and authentication paths do not exist, their final ownership and permissions could not be validated. Future preparation must enforce the reviewed regular-file, non-symlink and restrictive-permission requirements before service installation.

## High-risk Conflicts

No current high-risk diagnosis location or port conflict was found:

- No `/diagnosis/beta/` location exists.
- No `/api/diagnosis/` or `/api/diagnosis-feedback/` location exists.
- No public `/health` or `/ready` location exists.
- No wildcard CORS header was found in the active `framespark.cn` configuration excerpts.
- Port `8788` is available and does not conflict with analytics on `8787`.

This absence means the Beta is not exposed; it does not mean deployment is approved.

## Medium-risk Items to Confirm

- The active site config path is `/www/server/panel/vhost/nginx/framespark.cn.conf`; ordinary `ubuntu` access is restricted, while read-only inspection through sudo succeeded.
- The existing regex static-resource location matches extensions including JavaScript and CSS. A future Beta static location must use `location ^~ /diagnosis/beta/` so the authenticated alias takes precedence.
- The future exact `/diagnosis/beta` path without a trailing slash needs an explicit authenticated redirect or deny policy.
- Future Beta static handling must allow only required GET/HEAD behavior, disable directory listing, and prevent dotfile or path traversal access outside `beta-site/`.
- The future systemd configuration must use the confirmed `/usr/bin/npm` path and keep health/readiness local only.
- Env and Basic Auth files must be regular non-symlink files with root-controlled ownership and restrictive permissions; their contents must never be printed during verification.
- The future data directory must be a regular directory outside webroot, owned by the service user, non-symlinked, and writable only as required.
- Existing `/api/analytics/` must remain unchanged when diagnosis locations are drafted.

## Prohibited Actions

This precheck did not and does not authorize:

- Creating users, directories, releases, symlinks, env files, authentication accounts, data directories, or systemd units.
- Running deployment or installation scripts, package installation, Git pull, service start/stop/restart/enable, or Nginx reload.
- Reading env or htpasswd contents, writing credentials, exposing health/readiness, or opening Beta/API locations.
- Starting diagnosis-api, calling the diagnosis endpoint, running real AI, or restoring the public upload entry.

## Next-stage Decision

The server can proceed to **repository-only deployment configuration draft generation**. That phase may prepare and review proposed systemd/Nginx/env-template instructions in the repository, but it must not apply them to the server.

The draft must include:

- Dedicated no-login user and group requirements.
- Versioned release/current layout and an execution-time full-SHA lock.
- Env regular-file ownership and exact `0600` mode.
- Restrictive external data-directory ownership and mode.
- Basic Auth regular-file ownership and Nginx-readable restrictive mode.
- A hardened systemd unit using `/usr/bin/npm`, loopback `8788`, readiness checks and journald-safe logging.
- Three consistently authenticated `^~` Nginx locations that preserve `/diagnosis/` and `/api/analytics/` and do not expose health/readiness.
- Backup, config-test, rollback and public-site/analytics verification steps.

The next phase remains a draft review, not deployment approval or an MVP opening decision.
