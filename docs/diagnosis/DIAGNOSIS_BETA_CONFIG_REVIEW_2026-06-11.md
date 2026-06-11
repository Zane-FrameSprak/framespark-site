# Diagnosis Beta Deployment Configuration Review

Date: 2026-06-11
Reviewed baseline: `fb86638499e3a817f7873a3c66acb40d4d62c579`
Scope: repository-only review; no server connection, deployment, configuration application, credential creation, AI call, or public opening

## Review Decision

The drafts are suitable for the next **human confirmation and pre-deployment checklist** phase, but they are not execution-ready. The mandatory corrections below must remain blocking checklist items. This review does not authorize removing the shell safety exits, applying server configuration, or opening the Beta.

## Passed Items

### Systemd draft

- Uses the dedicated `framespark-diagnosis` user/group.
- Uses `/srv/framespark/diagnosis-api/current` and `/etc/framespark/diagnosis-api.env`.
- Explicitly binds `HOST=127.0.0.1` and `PORT=8788` and uses `Restart=on-failure`.
- Uses `/srv` for releases and `/var/lib` for writable data; `PrivateTmp` is isolation, not a production storage path.
- Hardening is compatible in principle with Node: no new privileges, private devices/tmp, protected system/home/kernel settings, empty capabilities and a single writable data path. It deliberately does not use `MemoryDenyWriteExecute`, which could block V8.
- `/health` and `/ready` are called through loopback only and are absent from the Nginx fragment.
- Journald receives application stdout/stderr. Current production code logs service state and error codes rather than complete materials or reports.

### Nginx draft

- Leaves the existing public `/diagnosis/` and `/api/analytics/` configurations unchanged.
- Protects `/diagnosis/beta/`, `/api/diagnosis/` and `/api/diagnosis-feedback/` with the same Basic Auth file.
- Uses `^~` for all Beta locations, preventing the existing static-resource regex location from bypassing the authenticated Beta prefix.
- Limits both API locations to POST; static Beta content uses GET/HEAD semantics.
- Uses a 5 MB diagnosis body limit, 240-second diagnosis read/send timeout, server-derived identity and client IP headers, and loopback upstream port `8788`.
- Does not proxy health, readiness or dev routes and does not add wildcard CORS headers.
- Clearly states that it is a location fragment and must not replace the complete site configuration.

### Env draft

- Contains only `DEEPSEEK_API_KEY=REPLACE_ME`; no real key, token, secret or credential is present.
- Enables the three production V1 switches, fail-closed and Beta identity enforcement while keeping dev tools disabled.
- Contains the approved upload, DOCX expansion, text, timeout, provider-call, account/IP/global, feedback and concurrency limits.
- Uses external data storage, 30-day metadata retention, 14-day consented-review retention, the FrameSpark Origin and loopback trusted proxy.
- Documents the fixed identity header and metadata-only logging contract. The file correctly warns that those two names are not dynamically read by the current application.

### Safety guards

- Both command drafts are non-executable repository files and exit with status 64 before all command bodies.
- The deployment draft fetches `origin/main`, requires a clean worktree, compares `HEAD` with `origin/main`, requires a 40-character SHA and checks the archive checksum.
- It uses `/tmp` only for transfer staging; the formal runtime remains under versioned `/srv` releases.
- It requires local health/readiness and no-AI checks before Nginx review, and does not automate a real-AI smoke.
- The rollback draft closes Beta routing before switching releases and requires `nginx -t` before reload.

## Mandatory Corrections Before Execution

These issues do not require business-code changes to document, but the command/location drafts must be revised and re-reviewed before any execution task.

1. **Review the full candidate range.** The deployment draft shows only the candidate commit and runs `git diff --check` against its parent. It must record an approved base SHA and require review of the complete `approved-base..candidate` range so multiple unreviewed commits cannot enter a release.
2. **Do not run package lifecycle code as root.** `sudo npm ci --omit=dev` and root-run npm tests execute repository-controlled scripts with root privileges. Prepare dependencies and run tests as a dedicated unprivileged build/runtime user, then transfer final release ownership to root/read-only.
3. **Avoid production-data test pollution.** The post-start `test:mvp-production-safety` inherits the production data directory and writes a synthetic metadata record. Replace it with a non-persisting validation or an isolated temporary test-data path outside the production store, with explicit cleanup and no weakening of production readiness.
4. **Make user creation idempotent and verifiable.** The draft currently always runs `useradd`. It must create the user only when absent; when present, verify system UID, group, `/usr/sbin/nologin` and no writable home.
5. **Add post-install metadata checks.** Verify env and htpasswd are regular non-symlink files with expected owner/group/mode, the data path is a non-symlink directory with restrictive ownership, and `current` resolves inside the reviewed releases directory.
6. **Add an explicit manual-stop command before Nginx mutation.** A comment saying `STOP HERE` is not an execution guard. The future execution runbook must end that phase until the merged site config and all three authenticated locations receive separate approval.
7. **Block hidden-file serving in the Beta alias.** Because `^~` bypasses server-level regex locations, add an audited hidden-file denial or a strict Beta asset allowlist. Confirm `disable_symlinks` behavior with the root-owned `current` symlink on the production Nginx build.
8. **Make rollback config replacement transactional.** The rollback draft overwrites the active config before testing it. Stage and validate a candidate restoration or keep an immediate restore-on-test-failure path so a failed `nginx -t` cannot leave an unintended on-disk config.
9. **Verify the analytics backend, not only its JavaScript asset.** Rollback currently checks `/js/analytics.js`, which does not prove the `/api/analytics/` proxy and port `8787` remain operational. Add a known non-mutating backend check or combine process/listener and active-config verification.
10. **Treat the placeholder key as fail-closed outside this script.** The deployment draft rejects the exact placeholder, but application readiness accepts any non-empty key. The pre-deployment checklist must independently reject `REPLACE_ME` without printing the env. A separate code plan is required if application-level placeholder rejection is desired.

## Human Confirmation Items

- Run `systemd-analyze verify` against the exact reviewed unit and confirm `EnvironmentFile` plus explicit HOST/PORT produce the intended effective environment.
- Confirm `ProtectSystem=strict`, `PrivateDevices`, npm/Node execution and release permissions on the target host before service start.
- Confirm the Nginx worker group and choose a restrictive htpasswd mode that remains readable by that worker.
- Confirm whether `/diagnosis/beta` without a slash should remain a public 404 or become an authenticated redirect.
- Confirm that Origin enforcement remains application-level. The application rejects foreign Origins but permits requests without Origin; Basic Auth and trusted identity remain the primary controls.
- Confirm review-consent behavior: default diagnosis metadata excludes complete material/report, while explicit consent stores complete material and `reportV1` for at most 14 days outside webroot.
- Confirm feedback retention is acceptable: feedback may contain bounded comments and report summary/next-step excerpts, stored outside webroot for the metadata retention period.
- Confirm legal approval, invitation credential owner, provider budget, maintenance window, previous-release compatibility and rollback operator.

## Security Findings

- No draft opens the formal `/diagnosis/` page.
- All three Beta locations have Basic Auth; neither API is left unprotected in the fragment.
- No public health/readiness route is defined.
- No wildcard CORS response is defined; the upstream receives the original Origin for application validation.
- No real key, htpasswd content, private key, full sample material or full report is present in the drafts.
- Production fail-closed behavior is required by env and covered by existing no-AI tests; unsafe V1 failure is not returned as a successful legacy report.
- Journald does not receive complete report/material from current explicit log statements. Consented full records and bounded feedback content are disk retention concerns, not journald output.

## Next Phase

The project may enter **human confirmation and pre-deployment checklist preparation**. That checklist must track every mandatory correction above as unresolved until evidence is attached.

Deployment remains prohibited. Do not connect to the server, remove shell safety exits, write real env/credentials, install packages, start services, change/reload Nginx, run real AI, or expose `/diagnosis/beta/` or `/api/diagnosis/` under this review result.
