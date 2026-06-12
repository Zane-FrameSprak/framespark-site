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
