# Diagnosis MVP Beta Controlled Deployment - Stage A

Execution date: 2026-06-12
Record filename retained from the approved 2026-06-11 task.
Target host: `VM-4-9-ubuntu`

## Scope And Stop Boundary

Stage A installed one locked release, non-secret environment configuration, and a systemd unit for static verification. It did not run `daemon-reload`, enable or start the service, modify or reload Nginx, create Basic Auth, expose Beta/API routes, or call real AI.

## Locked Candidate And Artifacts

- Candidate SHA: `f4451587f31fc31c5d49b243f0faf76e28e273e0`
- Local `HEAD` and `origin/main` matched the candidate with a clean worktree before execution.
- The candidate contains the approved baseline commits `61439fc` and `f445158`.
- Diagnosis API tree: `b57bf7c7d7229a9ba0f67776b810de9a12bc38ab`
- Release archive SHA-256: `85a0747bbde42d713daa4792ceddfdb3265fb525d9d223bdbe5a1c5d6856b918`
- systemd unit SHA-256: `f2ffef048851252dd10aa129ca4b2bb270fb9bcaf4bb805628934489cf51fb5e`
- Non-secret env SHA-256: `df60a37d667910e004b19c80e7b48cfc9afd804ca1363b9e8c23a9d7ac6ceb0b`
- The env artifact omits `DEEPSEEK_API_KEY`; it contains no placeholder pretending to be a production secret.

## Server Baseline And Backup

- Node: `/usr/bin/node`, `v20.20.2`; npm: `/usr/bin/npm`, `10.8.2`.
- Analytics remained on `127.0.0.1:8787`; port `8788` remained unused.
- Home and frozen `/diagnosis/` pages returned HTTP 200.
- Active Nginx config SHA-256 remained `49f693bf8a461c136e3c72965b47c497e56820faa607617139ce41725a10b4d4`.
- Backup: `/etc/framespark/backups/nginx/framespark.cn.conf.pre-beta-20260612-092047`, `root:root`, mode `0600`, with the same SHA-256.
- No active Diagnosis Beta/API/feedback/health/readiness location or wildcard CORS rule was found; `/api/analytics/` remained present.

## Installed Infrastructure

- User/group: system identity `framespark-diagnosis`, home `/nonexistent`, shell `/usr/sbin/nologin`.
- Release: `/srv/framespark/diagnosis-api/releases/f4451587f31fc31c5d49b243f0faf76e28e273e0`, `root:framespark-diagnosis`, mode `0750`, readable but not writable by the service user.
- Current link: `/srv/framespark/diagnosis-api/current` resolves exactly to the locked release.
- Data: `/var/lib/framespark-diagnosis`, `framespark-diagnosis:framespark-diagnosis`, mode `0700`, writable by the service user.
- Env: `/etc/framespark/diagnosis-api.env`, regular file, `root:root`, mode `0600`, not readable by the service user, and still missing the real provider key.
- Unit: `/etc/systemd/system/framespark-diagnosis.service`, regular file, `root:root`, mode `0644`.
- Build and upload staging directories were removed after verification. No code or data entered the public webroot or server `/tmp`.

## Checks

- `npm ci --omit=dev` ran as `framespark-diagnosis`; 109 packages installed. npm reported one moderate audit finding, which was recorded but not auto-fixed.
- `npm run check` passed.
- `test:mvp-production-safety`: 10/10 passed.
- `test:mvp-docx-safety`: 6/6 passed.
- `test:mvp-retention`: passed.
- `test:mvp-http-integration`: passed using local fake-provider behavior only.
- `systemd-analyze verify` passed for the Diagnosis unit. Two warnings referenced existing host `tat_agent` and `snapd` units, not the Diagnosis unit.
- The Diagnosis service is `inactive` and `disabled`; Diagnosis journald entry count is zero.
- No listener appeared on `8788`; no Basic Auth file or public Beta directory was created.

## Traffic Lights

1. Deployment SHA lock: **Green**.
2. Server baseline: **Green**.
3. Analytics `8787`: **Green**.
4. Diagnosis `8788`: **Green** - intentionally no listener.
5. Dedicated user and directories: **Green**.
6. Release/current: **Green**.
7. Env permissions and secret state: **Yellow** - file/type/permissions are correct, but the real DeepSeek key is intentionally absent.
8. systemd static verification: **Green** - unit verified; service remains inactive/disabled.
9. Public website and frozen `/diagnosis/`: **Green**.
10. Nginx unchanged and Beta unopened: **Green**.
11. Sensitive information and logs: **Green** - no key, material, report, env content, or real AI output was logged.

## Stop Conclusion

**需要用户安全写入秘密。** The user should SSH independently and use `sudoedit /etc/framespark/diagnosis-api.env` or an equivalent non-echoing server-side method to add the real key. The key must not be sent in chat, command arguments, Git, or logs. A separate explicit authorization is still required before `daemon-reload`, service start, Basic Auth creation, Nginx changes, any real-AI smoke, or any Beta/API opening.

## Stage A2 - Security Patch Release Refresh (2026-06-12)

Stage A2 replaced only the inactive immutable release selected by `current`. It did not change the env, systemd unit, Nginx, public webroot, access controls, or runtime state.

### Locked Candidate And Artifact

- Fresh fetch candidate: `683dea7fa98848cc40829b825cf4209692b7abe4`.
- Local worktree was clean with `HEAD == origin/main`; the candidate contains `683dea7`.
- Review range from the old candidate contained the Stage A record, npm audit review, and the `qs` lockfile patch. The only `diagnosis-api` change was the three-field `qs` lockfile resolution update.
- Diagnosis API tree: `85f2c2b99c2d5f1968c9ef8a09a15eafc843f67b`.
- Release archive SHA-256: `ce918ad0503c8e82f9f03123a633ab13840802aef03f83036c5af7e123c2a6dc`.

### Release Installation And Verification

- New release: `/srv/framespark/diagnosis-api/releases/683dea7fa98848cc40829b825cf4209692b7abe4`.
- `npm ci --omit=dev` ran as `framespark-diagnosis` with isolated HOME, npm cache, and fictional test-data paths under `/var/tmp`.
- `npm ls qs --omit=dev --all` resolved both Express and body-parser to `qs@6.15.2`.
- `npm audit --omit=dev` reported `0 vulnerabilities`.
- `npm run check` passed.
- All 18 approved no-AI commands passed: V1 gatekeeper/decision, staged runner, pipeline switches/integration, stage prompts/client, final structure, real-prompt gate, unified V1 prompt, report compatibility/pipeline, sample-run summary, input handling, rate limit, production safety/public DTO/fail-closed, DOCX safety, retention, and HTTP integration.
- No provider key was available to the test environment and no real AI call was made.
- Build and upload staging directories were removed after verification.

### Atomic Release Selection

- The new release is `root:framespark-diagnosis`, mode `0750`; the service identity can read it but cannot write it.
- All release entries are root-owned. The only group/other-writable mode entries are npm-generated `.bin` symbolic links; their targets and release directories remain non-writable to the service user.
- `current` atomically resolves to `/srv/framespark/diagnosis-api/releases/683dea7fa98848cc40829b825cf4209692b7abe4`.
- `previous` atomically resolves to the retained `/srv/framespark/diagnosis-api/releases/f4451587f31fc31c5d49b243f0faf76e28e273e0`.
- The previous release was not deleted or modified.

### Boundary Verification

- The service remains `inactive` and `disabled`; no daemon reload, enable, start, or restart occurred.
- Port `8788` remains unused; analytics remains listening on `127.0.0.1:8787`.
- The env remains a regular `root:root` mode `0600` file with unchanged SHA-256 `df60a37d667910e004b19c80e7b48cfc9afd804ca1363b9e8c23a9d7ac6ceb0b`; its contents were not read and the real key remains absent.
- Active Nginx remained unchanged at SHA-256 `49f693bf8a461c136e3c72965b47c497e56820faa607617139ce41725a10b4d4`; no Diagnosis Beta/API/feedback/health/readiness location exists.
- The public home and frozen `/diagnosis/` returned HTTP 200. The apparent HTTP 200 responses for `/diagnosis/beta/` and `/api/diagnosis/` were byte-identical to the existing static `404.html`, contained no Beta/upload/API markers, and were not functional routes.
- Diagnosis journald entry count remains zero. No key, env content, submitted material, report, or provider response was logged.

### Stage A2 Traffic Lights

1. Latest SHA lock: **Green**.
2. New release installation: **Green**.
3. `qs@6.15.2`: **Green**.
4. Production audit, zero vulnerabilities: **Green**.
5. No-AI regression: **Green**.
6. Atomic `current` switch: **Green**.
7. Previous release retained: **Green**.
8. systemd inactive/disabled: **Green**.
9. Port `8788` without listener: **Green**.
10. Analytics, public website, and frozen Diagnosis page: **Green**.
11. Nginx unchanged and Beta unopened: **Green**.
12. Sensitive information and logs: **Green**.

### Stage A2 Stop Conclusion

**可以安全写入秘密。** This conclusion authorizes only the user's separate server-side, non-echoing key entry. It does not authorize daemon reload, service activation, Basic Auth creation, Nginx changes, real-AI smoke, invitation distribution, or Beta/API opening. Each remains a separate explicit approval gate.

## Stage B0 - Service Load And Local Readiness Attempt (2026-06-12)

Stage B0 was limited to loading and starting the existing systemd unit, local health/readiness checks, and boundary verification. No Nginx configuration, public route, provider request, diagnosis request, or real AI call was allowed.

### Pre-start Verification

- `current` still resolved to release `683dea7fa98848cc40829b825cf4209692b7abe4`; `previous` still resolved to `f4451587f31fc31c5d49b243f0faf76e28e273e0`.
- The env remained a non-symlink regular file owned by `root:root` with mode `0600`. The provider key was confirmed present and non-empty without displaying its value.
- Port `8788` was free; analytics remained on `127.0.0.1:8787`.
- Active Nginx remained at SHA-256 `49f693bf8a461c136e3c72965b47c497e56820faa607617139ce41725a10b4d4` with no Diagnosis Beta/API/feedback/health/readiness location.
- The public home and frozen `/diagnosis/` pages returned HTTP 200; the Diagnosis page had no upload, retired script, or API reference.

### Start Result And Controlled Stop

- `systemd-analyze verify` passed for the Diagnosis unit. Existing host warnings concerned `tat_agent` and `snapd`, not this service.
- `systemctl daemon-reload` completed, then the one authorized start attempt failed in `ExecStartPost`.
- The readiness probe attempted `http://127.0.0.1:8788/ready` before Node had begun listening and received connection refused. The current curl command did not retry connection-refused failures, so systemd marked the start failed.
- The service was immediately stopped under the red-light rule. Final state is `inactive/disabled`, with no listener on `8788`.
- No `/health` or `/ready` success result was obtained; no second start was attempted.

### Boundary And Sensitive-data Verification

- Provider usage remained zero and no provider usage file was created.
- The limited startup journal contained no key, Authorization value, submitted material, complete report, or provider response signal.
- Nginx hash and routes remained unchanged; the public Diagnosis API path still resolves to the existing static 404 response rather than a functional API.
- Analytics, the public website, and the frozen `/diagnosis/` page remained healthy.

### Stage B0 Traffic Lights

1. `current` / `previous`: **Green**.
2. Env security state: **Green**.
3. systemd verify: **Green**.
4. Service start: **Red** - `ExecStartPost` readiness race caused startup failure.
5. Health: **Red** - not reached successfully.
6. Readiness: **Red** - connection refused during the startup probe.
7. Port `8788` loopback-only: **Yellow** - no unsafe bind occurred, but the service is stopped and no listener remains.
8. Provider calls remain zero: **Green**.
9. Startup journal contains no detected sensitive content: **Green**.
10. Analytics, public website, and frozen Diagnosis page: **Green**.
11. Nginx unchanged and Beta/API unopened: **Green**.
12. Final service state: **stopped (`inactive/disabled`)**.

### Stage B0 Stop Conclusion

**必须暂停修复。** Do not enter Stage B1. A separate reviewed systemd-only change must make the startup readiness probe tolerate the application startup window, for example by using an appropriate connection-refused retry strategy or a reviewed readiness helper. The unit must then pass static review before one separately authorized B0 retry. Do not change Nginx, open Beta/API routes, or run a real-AI smoke as part of that correction.

## Stage B0.1 - Readiness Race Correction And Controlled Retest (2026-06-12)

### Root-cause Confirmation And Repository Correction

- Read-only inspection confirmed the installed unit used the expected npm path, release working directory, env file and hardening. The service identity could read the release and write the data directory; `8788` was free.
- The failed B0 journal contained only the immediate `ExecStartPost` connection-refused result. It contained no Node startup, permission, module, env parsing or port-conflict error.
- The repository systemd draft now removes `ExecStartPost`. The Beta deployment draft performs a bounded external readiness poll after start, and the legacy systemd installer uses the same pattern to avoid recreating the race.
- The external gate waits at most 30 seconds, checks that the service remains active with zero restarts, polls local `/ready`, then verifies local `/health`; failure stops the service.

### Server Unit Installation And Start Evidence

- Original unit SHA-256: `f2ffef048851252dd10aa129ca4b2bb270fb9bcaf4bb805628934489cf51fb5e`.
- Corrected unit SHA-256: `1c3168f8109778debd0d83577e36a31e55fae8f00698f3ebf2950b4b8473e674`.
- Backup: `/etc/framespark/backups/systemd/framespark-diagnosis.service.pre-b0.1-20260612-161812`, `root:root`, mode `0600`.
- The corrected unit passed `systemd-analyze verify`, was loaded while the service remained disabled, and received one authorized start attempt.
- The application became ready on polling attempt 3. `/ready` returned a valid success response, then `/health` returned a valid success response. The journal confirmed the application listened on `127.0.0.1:8788` during this attempt.
- No second application startup error was observed. This confirms the original B0 service failure was caused by the unit-level readiness race.

### Verification Harness Failure And Rollback

- A later journal-redaction check supplied an ISO-8601 timestamp with `T` to this host's `journalctl --since`; `journalctl` rejected that timestamp format.
- The unexpected verification-command failure triggered the approved rollback even though application readiness and health had passed.
- No second start was attempted. The original unit was restored, `daemon-reload` completed, and the service returned to `inactive/disabled` with no listener on `8788`.
- Upload staging was removed. The corrected repository drafts remain uncommitted for review.

### Boundary Verification

- Provider usage remained zero; no provider usage file was created.
- The seven journal lines from the B0.1 window contained no detected key, Authorization value, material, complete report or provider response signal.
- Analytics remained on `127.0.0.1:8787`; the public home and frozen `/diagnosis/` returned HTTP 200 with no upload or API reference.
- Active Nginx remained SHA-256 `49f693bf8a461c136e3c72965b47c497e56820faa607617139ce41725a10b4d4`; no Beta/API/feedback/health/readiness location was added.

### Stage B0.1 Traffic Lights

1. Root cause limited to the `ExecStartPost` race: **Green** - corrected unit reached ready/health without another application error.
2. Repository unit correction: **Green**.
3. systemd verify: **Green**.
4. Service active/running: **Red for final state** - it ran successfully during verification, then rollback stopped it.
5. Readiness: **Green during the single attempt**.
6. Health: **Green during the single attempt**.
7. Port `8788` loopback-only: **Green during the attempt**; final state has no listener.
8. Provider calls remain zero: **Green**.
9. Journal contains no detected sensitive content: **Green**.
10. Analytics, public website and frozen Diagnosis page: **Green**.
11. Nginx unchanged and Beta/API unopened: **Green**.
12. Final service state: **stopped (`inactive/disabled`)**, original unit restored.

### Stage B0.1 Stop Conclusion

**必须暂停，不允许进入 Stage B1。** The readiness-race correction itself is validated, but the final active-service acceptance state was not retained because the verification harness failed and correctly rolled back. Before a separately authorized single B0 retry, change only the operator-side journal time argument to the host-compatible `YYYY-MM-DD HH:MM:SS` form, reinstall the already-reviewed corrected unit, and repeat the same bounded checks. Do not change application code, env, Nginx, access routes or provider behavior.

## Stage B0.2 - Invocation-scoped Log Check And Complete Local Validation (2026-06-12)

### Repository And Unit Preparation

- The deployment command draft now obtains the non-empty systemd `InvocationID` after start and reads only `_SYSTEMD_INVOCATION_ID=<id>` journal entries. It counts sensitive signals without printing journal content and no longer depends on timestamp parsing.
- The corrected unit remains free of `ExecStartPost`; both deployment command paths use a bounded external readiness/health gate.
- Shell syntax checks and `git diff --check` passed before server installation.
- The restored old unit was backed up to `/etc/framespark/backups/systemd/framespark-diagnosis.service.pre-b0.2-20260612-163826` before installing the corrected unit.
- Installed corrected unit SHA-256: `1c3168f8109778debd0d83577e36a31e55fae8f00698f3ebf2950b4b8473e674`, `root:root`, mode `0644`, regular file.
- `systemd-analyze verify` passed; the existing unrelated `tat_agent` and `snapd` host warnings remained unchanged. The service remained disabled.

### Single Start And Local Validation

- Exactly one B0.2 start was performed. The service reached readiness on polling attempt 3, within the 30-second limit, then `/health` returned a valid success response.
- Final runtime state is `active/running`, with a valid MainPID, `NRestarts=0`, and unit state `disabled`.
- Port `8788` has exactly one listener at `127.0.0.1:8788`; no wildcard or public bind exists.
- Provider usage was zero before and after the start; provider-call delta is zero. No diagnosis request or provider request was made.
- The systemd InvocationID was non-empty. The invocation-scoped journal contained three lines and zero sensitive-keyword matches; no journal body was copied into this record.

### External Boundary Verification

- Analytics remained listening on `127.0.0.1:8787`.
- The public home and frozen `/diagnosis/` returned HTTP 200; the Diagnosis page still contains no upload control, retired script or `/api/diagnosis` reference.
- Active Nginx remained SHA-256 `49f693bf8a461c136e3c72965b47c497e56820faa607617139ce41725a10b4d4`.
- No Beta/API/feedback/health/readiness location exists. The public Diagnosis API path still resolves to the static 404 response.
- Upload staging was removed after verification. Nginx, env, application code and public webroot were not modified.

### Stage B0.2 Traffic Lights

1. Repository log-check correction: **Green**.
2. Corrected unit installation: **Green**.
3. systemd verify: **Green**.
4. Service active/running: **Green**.
5. Readiness: **Green**.
6. Health: **Green**.
7. Port `8788` loopback-only: **Green**.
8. Provider-call delta zero: **Green**.
9. InvocationID journal check: **Green**.
10. Sensitive journal signals: **Green** - zero matches.
11. Analytics, public website and frozen Diagnosis page: **Green**.
12. Nginx unchanged and Beta/API unopened: **Green**.
13. Final service state: **active/disabled**.

### Stage B0.2 Stop Conclusion

**允许进入 Stage B1 的独立规划/授权阶段，但不自动进入。** B0.2 proves only local service startup, readiness, health, loopback binding, zero provider calls and unchanged public boundaries. It does not authorize Basic Auth creation, Nginx modification or reload, Beta/API/feedback exposure, diagnosis POST requests, real AI calls, invitation distribution, commit or push.
