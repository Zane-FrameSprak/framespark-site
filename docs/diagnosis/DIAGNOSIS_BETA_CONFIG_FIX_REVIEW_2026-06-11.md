# Diagnosis Beta Deployment Draft Blocker Fix Review

Date: 2026-06-11
Scope: repository-only draft correction; no server connection, deployment, credential creation, service action, Nginx change, AI call, or public opening

## Decision

The ten blockers recorded in `DIAGNOSIS_BETA_CONFIG_REVIEW_2026-06-11.md` are addressed at the repository-draft level. The drafts remain deliberately non-executable and are suitable only for the next **human confirmation and pre-deployment checklist** phase. This review does not authorize server execution or removal of the safety exits.

## Blocker Resolution Evidence

1. **Complete candidate-range review:** the local release draft requires an approved full base SHA, a freshly resolved full `origin/main` candidate SHA, ancestry validation, commit-list review, full diff/stat review and `git diff --check` for the complete approved range.
2. **No root npm lifecycle execution:** dependency installation, checks and no-AI tests run as the dedicated unprivileged service identity. After checks, the completed release becomes root-owned, service-group-readable and runtime-read-only.
3. **No production-data test pollution:** no-AI checks use built-in fictional fixtures and a release-specific `/var/tmp` data directory. The isolated directory is removed and its absence verified before promotion; production retention storage is not used by those checks.
4. **Idempotent service identity:** the draft creates the system group and user only when absent, then verifies primary group, system UID/GID, no-login shell and non-writable `/nonexistent` home metadata before continuing.
5. **Post-install metadata checks:** env and Basic Auth sources/targets must be non-empty regular non-symlink files with exact owner/group/mode checks. The data directory must be a non-symlink with exact service ownership and mode `0700`; `current` must resolve under the reviewed releases directory.
6. **Hard Nginx phase stop:** the deployment command material returns status `75` before any Nginx test/reload command. A separately approved manual merge review is required before that guard may be removed.
7. **Hidden-file protection:** the authenticated `^~ /diagnosis/beta/` location rejects dotfiles and hidden path segments locally, while retaining `autoindex off` and symlink restrictions.
8. **Transactional rollback:** rollback verifies reviewed pre/post configuration hashes, preserves the active config, restores it on validation or reload failure, and stops before release switching when routing rollback is not safely active.
9. **Analytics backend verification:** rollback verifies the `127.0.0.1:8787` listener and the active `/api/analytics/` proxy target, rather than relying on the public analytics JavaScript asset.
10. **Provider-key fail-closed check:** the deployment material requires a non-empty key line and rejects known placeholder values without printing the env. Application-level placeholder rejection remains a separate code concern if broader placeholder patterns are later required.

## Additional Draft Safeguards

- Both shell drafts remain mode `0644` and exit with status `64` before all command-review functions.
- The systemd draft requires target-host `systemd-analyze verify` and a local readiness check. Any incompatible hardening directive must be isolated and re-reviewed rather than removing the hardening set.
- The Basic Auth group remains a mandatory placeholder until the active Nginx worker group is confirmed. Its source and installed file must be non-empty and must never be printed.
- The Nginx fragment keeps `/diagnosis/` and `/api/analytics/` unchanged, protects all three Beta locations with the same auth boundary, and exposes neither health nor readiness.
- Default metadata excludes complete submitted material and complete reports. Consented review records remain outside webroot and are bounded by the documented retention period.

## Remaining Human Confirmation

- Replace and record the approved base/candidate full SHAs after a fresh fetch; review the complete range and archive checksum.
- Confirm target-host service UID/GID policy, release group-readability, Nginx worker group, npm/Node paths, systemd hardening compatibility and `disable_symlinks` behavior.
- Inspect the active site configuration for location conflicts, preserve `/api/analytics/`, and manually review the merged three-location Beta fragment before any Nginx mutation.
- Independently review the real env, Basic Auth file, legal approval, provider budget, previous release, checksums, maintenance window and rollback operator without exposing credential contents.
- Keep the public `/diagnosis/` frozen until a separately authorized deployment and invitation-only acceptance review is complete.

## Next Allowed Phase

The next allowed phase is **human confirmation and pre-deployment checklist preparation**. Deployment remains prohibited: do not connect to the server, execute these drafts, remove safety exits, write credentials, install packages, start services, change/reload Nginx, run real AI, or expose the Beta page or API.
