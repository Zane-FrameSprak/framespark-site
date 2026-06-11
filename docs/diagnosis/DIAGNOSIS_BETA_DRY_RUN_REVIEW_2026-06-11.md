# Diagnosis Beta Deployment Dry-run Review

Date: 2026-06-11
Scope: repository-only review; no SSH, server change, AI call, deployment, or public exposure

## Reviewed Baseline

After `git fetch origin main`, the worktree was clean and both local `HEAD` and `origin/main` resolved to:

`5d12fb7c064e0d0a57bb4d8cfb60cbf2cd166cac`

This SHA is the current reviewed candidate only. Every later precheck must fetch again, require `HEAD == origin/main`, and record the new full SHA. A changed SHA requires a new diff review.

Reviewed files include the deployment plan/runbook, production config/readiness checks, Beta source boundary, package scripts, and the three systemd/Nginx uninstall/install drafts.

## Items That Can Continue

- The versioned `releases/<commit>` plus atomic `current` symlink strategy matches the production plan.
- The runtime uses a dedicated no-login user, `/etc/framespark/diagnosis-api.env`, `/var/lib/framespark-diagnosis`, loopback `127.0.0.1:8788`, and no production `/tmp` path.
- The systemd draft checks the service user, env mode, port, release symlink, package metadata, dependencies, data ownership and npm availability.
- The unit includes no-new-privileges, private temp, protected system/home, restricted address families, bounded timeouts and a local readiness check.
- Journald is the default service output target; application logging is designed to emit metadata/error codes instead of complete material or reports.
- The Nginx script performs an audit and prints a manual snippet. It does not blind-edit or reload Nginx.
- All three Beta locations use Basic Auth in the canonical snippet. Diagnosis/feedback APIs overwrite trusted identity and IP headers, and the diagnosis route uses `5m` and `240s` limits.
- No health, readiness or dev route is included in the public proxy snippet. `/api/analytics/` is not modified.
- The runbook rollback order starts by closing Beta access before switching releases.
- All three shell drafts pass `bash -n` in this review.

## Must Be Corrected or Locked Before Execution

These are deployment gates; they do not require business-code changes:

- Verify the env file is a regular non-symlink file, owned by root, with exact mode `0600`. The current installer checks only existence and mode.
- Verify the data directory is not a symlink, is owned by the service user/group, and has a restrictive mode. The installer currently checks existence and user ownership only.
- Resolve and record the actual npm binary. The installer checks `command -v npm` but the unit uses `/usr/bin/npm`; deployment must stop if they differ.
- Confirm the service user's shell is non-login and release files are immutable/read-only to that user except the external data directory.
- Review whether the readiness retry window is sufficient for the production startup path; do not compensate by exposing readiness publicly.
- Inspect the active Nginx configuration with `nginx -T`, not only text grep, so commented, duplicate, nested or conflicting locations are detected.
- Verify the Basic Auth file is a regular non-symlink file with root-controlled ownership and restrictive read access for Nginx.
- Explicitly allow only GET/HEAD for Beta static assets and POST for the two API routes; define the desired handling for `/diagnosis/beta` without a trailing slash.
- Confirm the Beta alias cannot serve dotfiles, source outside `beta-site/`, directory listings or the API package.
- Confirm application Origin/CORS enforcement and `TRUST_PROXY=loopback`; Origin is supplementary and does not replace Basic Auth.
- Record the previous release SHA and timestamped Nginx backup before any future switch.

## Human Confirmation Still Required

- Human legal review of privacy, terms, third-party AI processing, retention and deletion wording.
- Owner and distribution process for invitation credentials; no credentials may be stored in Git or handoff documents.
- Approved production env values and secure write procedure without printing the key.
- Exact active Nginx config path and Nginx runtime user/group on Tencent Cloud.
- Real-AI call budget and explicit authorization for the single production smoke.
- Rollback operator, maintenance window and acceptance checks for the public website and analytics.

## Read-only Server Precheck Decision

The repository is suitable for the next **server read-only precheck**, but not for installation or deployment. That precheck may inspect only:

- OS, Node/npm/curl paths and versions, disk space and port listeners.
- Existence, type, owner and permissions of service/release/env/data/auth paths without reading env or password contents.
- Existing systemd unit state using status/show/cat commands only.
- Active Nginx configuration and location collisions using read-only output.
- Public webroot isolation and the unchanged `/api/analytics/` configuration.

It must not run any installer, create users/directories/accounts, write env files, switch symlinks, install packages, start/restart services, reload Nginx, call real AI, or expose Beta/API routes.

## Risk Summary

- Accidental exposure risk remains if any one of the three Nginx locations lacks authentication.
- A hardcoded stale commit can deploy unreviewed or incomplete behavior; execution-time SHA locking is mandatory.
- Env/auth symlinks or permissive data paths could leak credentials or retained review content.
- Nginx location conflicts could expose Beta assets, shadow `/api/analytics/`, or route API failures to static HTML.
- An npm path mismatch could make the reviewed service fail only after systemd mutation.
- Provider timeout, unsafe-output fallback or internal-field exposure must remain controlled failures, never successful public reports.

No deployment approval or MVP opening decision is granted by this review.
