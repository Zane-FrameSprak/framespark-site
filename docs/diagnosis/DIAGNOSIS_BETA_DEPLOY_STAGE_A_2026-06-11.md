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
