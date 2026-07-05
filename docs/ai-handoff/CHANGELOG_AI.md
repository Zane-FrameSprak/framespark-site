# AI Changelog

> Format for new entries: `YYYY-MM-DD (Agent): summary`. New entries MUST include the AI agent identifier in parentheses after the date.

## Recent Summary

- 2026-07-05 (Codex): Refreshed the local-only internal admin console from the
  old invite-code-era status view to the current public-beta operations view.
  Added a public-beta operations panel covering the homepage public entry,
  Cookie-protected Beta boundary, backend release `0104cfe`, 50,000-token input
  cap, 5,000,000-token daily provider budget, the 2026-06-30 fictional smoke,
  B4 T0 not started, Cookie logging disabled, and the separate analytics
  stability issue. Updated the console README and handoff architecture/state
  docs. No production deploy, server change, Diagnosis POST, AI call, analytics
  repair, or B4 action occurred.

- 2026-06-30 (Codex): Ran one authorized fictional public-beta real-AI smoke
  under the user's 5 CNY budget. The request used a short fictional material,
  returned HTTP `200` in about 59.5 seconds, reached `stage=final`, and exposed
  only the public DTO keys. Provider usage increased from `0 / 0` to `4 calls /
  13,095 tokens`, metadata increased from `2` to `3`, review stayed `0`,
  `fallback=false`, and model metadata is `deepseek-v4-flash`. The app-budget
  equivalent is about 0.03 CNY under the configured 5,000,000-token / 10 CNY
  daily budget. Temporary sample and full response files were deleted; only
  default metadata remains. Nginx logs after the smoke had zero Cookie,
  Authorization, key, prompt or sample-text matches; service stayed
  `active/running/enabled`, `NRestarts=0`, ready/health OK, and `8788`
  loopback-only. B4 T0 was not started.

- 2026-06-30 (Codex): Completed the public-beta P0 rollout. Nginx `site_total`
  now keeps the `cookie` JSON field empty in both the generated Nginx log
  format and the `/www/server/site_total/scripts/site_log_format.conf` source
  template, preventing automatic reversion to `$http_cookie`. Built and
  deployed the GitHub Actions Linux artifact for
  `0104cfe1d3bb31f57000453618c5a03163730c1b`; `previous` now points to
  `535640213756e07a4c144f1ea4eb9df98b2e305b`. Production env has
  `MAX_INPUT_TOKENS=50000` and `PROVIDER_GLOBAL_DAILY_TOKEN_LIMIT=5000000`.
  No-AI checks confirmed no-cookie Beta redirect, public-session cookie issue,
  empty-material `TEXT_REQUIRED`, over-token `TEXT_TOO_LONG`, and an isolated
  token-budget-full response of `今日诊断名额已满，请明天再来`. Service stayed
  `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788`
  loopback-only, homepage and `/diagnosis/` OK, provider usage `0` tokens/calls,
  metadata `2`, review `0`, and sensitive journal matches `0`. No real
  Diagnosis material, DeepSeek/AI call, B4 T0 start, analytics repair, or
  production `npm ci` occurred.

- 2026-06-27 (Codex): Merged and deployed the homepage Diagnosis system entry into a single public-beta entry. The Diagnosis platform card no longer renders the old separate `点击进入` button; it keeps only the public-beta copy and `进入公测` submit flow. Updated the homepage `main.js` cache version, deployed `index.html` and `js/main.js` to Tencent Cloud, and verified production no longer contains the duplicate homepage Diagnosis CTA. No Diagnosis API, Nginx, env, systemd, POST, AI call, B4 T0 or analytics action occurred.

- 2026-06-27 (Codex): Added repository-side global provider token budget tracking for Diagnosis. Provider responses now persist `usage.total_tokens` into the existing UTC-day usage file alongside provider call count; `PROVIDER_GLOBAL_DAILY_TOKEN_LIMIT` defaults to `5000000`, roughly the current 10 CNY/day budget target. Once the daily total is reached, new diagnosis requests return `今日诊断名额已满，请明天再来` before additional provider calls. Updated env examples, readiness checks, docs and no-AI tests. No production deploy, Diagnosis POST, DeepSeek/AI call, Nginx/env/systemd change, B4 T0 or analytics action occurred.

- 2026-06-27 (Codex): Implemented repository-side Diagnosis input token limiting. The API now pins `tiktoken@1.0.22`, initializes and reuses the `cl100k_base` encoding, exposes `MAX_INPUT_TOKENS=50000`, and rejects over-limit materials with `TEXT_TOO_LONG` before daily counters or provider budget creation. File-size limits and daily limits remain, with the admission order preserved as file-size/upload limit -> token count -> daily counters. Updated DOCX/text safety, HTTP integration, production-readiness, beta-access and no-AI regressions passed locally. No production deploy, Diagnosis POST, DeepSeek/AI call, Nginx/env/systemd change, B4 T0 or analytics action occurred.

- 2026-06-27 (Codex): Replaced the old inline geometric brand mark on formal Diagnosis, talent, and project detail subpage headers with the same `assets/brand/framespark-logo.svg` used on the homepage, then deployed only those seven HTML files to Tencent Cloud. Production verification confirmed `/diagnosis/`, `/talent/`, and representative project pages now reference the logo asset and the SVG is reachable. No Diagnosis API, Nginx, env, systemd, POST, AI call, B4 T0, or analytics action occurred.

- 2026-06-27 (Codex): Tightened and deployed the public Diagnosis Beta and shared subpage layout density. Commit `535640213756e07a4c144f1ea4eb9df98b2e305b` is now the Diagnosis API `current` release with `previous` at `ce440d7a92a7e6141915c3bfbb1e3277bb8fbb82`; static site pages reference `20260627-subpage-density1`, and Beta static assets reference `20260627-beta-density1`. The Beta page now uses a compact desktop hero/form layout so the diagnosis form fits at 100% zoom, while formal Diagnosis/legal/talent/project subpages have tighter hero and section spacing. GitHub Actions artifact passed local/server SHA, manifest and `better-sqlite3` native-load checks before deployment. Verification showed service `active/running/enabled`, `NRestarts=0`, ready/health OK, 8788 loopback-only, homepage and `/diagnosis/` `200`, `/diagnosis/beta/` no-cookie redirect, Cookie access to Beta HTML/CSS with the new version, provider/metadata/review unchanged at `1 / 2 / 0`, and zero sensitive journal matches. No Diagnosis POST, DeepSeek/AI call, Nginx reload, env change, B4 T0 start or analytics repair occurred.

- 2026-06-27 (Codex): Fixed and deployed the public beta UX polish. Commit `ce440d7a92a7e6141915c3bfbb1e3277bb8fbb82` is now the Diagnosis API `current` release with `previous` at `757c94ffaded6cfdf39e389979ff1c9195359d80`; homepage `js/beta-access.js` now resets the public beta button from `进入中...` on browser Back/bfcache return, and the Beta page CSS now matches the homepage black/gold grid, type scale, spacing and panel language. GitHub Actions artifact passed local/server SHA, manifest and `better-sqlite3` native-load checks before deployment. Verification showed service `active/running/enabled`, `NRestarts=0`, ready/health OK, 8788 loopback-only, homepage and `/diagnosis/` `200`, `/diagnosis/beta/` no-cookie redirect to `/#diagnosis-beta-entry`, Cookie access to Beta HTML/CSS with version `20260627-public-beta-polish1`, and provider/metadata/review unchanged at `1 / 2 / 0`. No Diagnosis POST, DeepSeek/AI call, Nginx reload, env change, B4 T0 start or analytics repair occurred.

- 2026-06-26 (Codex): Deployed Diagnosis public beta. Commit `757c94ffaded6cfdf39e389979ff1c9195359d80` is now the Diagnosis API `current` release with `previous` at `8e089c5bcf68086c787a3cafc58ba358d92e1ee1`; static homepage/legal/diagnosis files now show the public beta entry; `ENABLE_PUBLIC_BETA_ACCESS=true` and `ENABLE_BETA_CODE_ACCESS=false`; Nginx exposes exact `POST /api/beta-access/public-session`, disables the old verify proxy, keeps health/ready/internal out of public routing, and no longer logs `$http_cookie` in `site_total`. Verification showed public-session `200`, two scoped cookies, Cookie access to Beta HTML/app/css `200`, service `active/running/enabled`, `NRestarts=0`, ready/health OK, 8788 loopback-only, zero recent Cookie/sensitive log matches, and metadata/review/provider counts `2 / 0 / 1`. No Diagnosis POST, DeepSeek/AI call, new access code, B4 T0 start or analytics repair occurred.

- 2026-06-26 (Codex): Implemented repository-side Diagnosis public beta preparation. The homepage entry now shows "公测入口" and calls `POST /api/beta-access/public-session` instead of submitting an invite code; Diagnosis API now supports `ENABLE_PUBLIC_BETA_ACCESS` with signed 24-hour anonymous page/API cookies while keeping invite-code verification available for rollback. Production readiness now rejects public-beta configs above account/session `1`, IP `3`, global diagnoses `5`, provider daily `30`, and provider calls per diagnosis `5`. Updated Beta/legal copy, no-AI tests, and handoff docs. `npm --prefix diagnosis-api run check`, `test:beta-access`, `test:beta-access-frontend`, and `test:no-ai` passed. No production deploy, Nginx/env change, service restart, Diagnosis POST, DeepSeek/AI call, B4 T0, or analytics repair occurred.

- 2026-06-18 (Codex): Added color status dots to homepage project cards and deployed the change to Tencent Cloud. Project status text now carries `data-state`, CSS maps each development state to a small muted color dot, and homepage CSS/JS cache versions were bumped to `20260618-project-state-dots1`. Deployed only `index.html`, `css/style.css`, and `js/main.js`; production verification confirmed the new resource versions and state-dot CSS/JS are live. No backend, Nginx, env, Diagnosis POST, AI, invite-code, or B4 change occurred.

- 2026-06-18 (Codex): Updated and deployed homepage project statuses only. `《恭喜你，中奖了！》` and `《面试》` now show `拍摄筹备中`; `《红领带》` now shows `制作中`. Deployed only `js/site-data.js` to Tencent Cloud via minimal `sudo rsync` and verified production `site-data.js`. No backend, Nginx, env, Diagnosis POST, AI, invite-code, or B4 change occurred.

- 2026-06-18 (Codex): Deployed the homepage project-card copy refinement to Tencent Cloud with a minimal `sudo rsync` of `index.html`, `css/style.css`, `js/site-data.js`, and `js/main.js`. Production now references `20260618-project-cards1`; `site-data.js` no longer includes project duration/episode wording, and project cards display only type, title and status. No backend, Nginx, env, Diagnosis POST, AI, invite-code, or B4 change occurred.

- 2026-06-18 (Codex): Refined the homepage "开发中项目" cards so each card displays only project type, title and development status. Removed duration/episode wording from `js/site-data.js`, updated the card renderer to use `project.status`, aligned the three text rows with CSS grid, and bumped homepage CSS/JS resource versions. `node --check` for `js/site-data.js` and `js/main.js`, `git diff --check`, and a project-card data assertion passed. No deployment, backend, Nginx, env, POST, AI, or invite-code change occurred.

- 2026-06-18 (Codex): Refreshed the local-only internal admin console status cards and reminders. The console now reflects that public-security filing is approved and deployed, Diagnosis Beta invite-code access is live, five tester codes exist with 7-day/5-use defaults, and B4 T0 has not started. Verified `node --check` for the console server and client, `git diff --check`, and local `/api/console/config` plus `/api/console/summary` responses. No public deployment, server change, POST, AI call, or code generation occurred.

- 2026-06-18 (Codex): Updated and deployed the public-site filing footer to Tencent Cloud with a minimal `sudo rsync` of only footer-related static files. The footer now links `沪ICP备2026021671号` to MIIT, uses the user-provided official public-security icon at `assets/brand/beian-police.png`, links `沪公网安备31011502406316号` to the MPS query URL, and keeps the filing row horizontal on desktop while preserving mobile stacking. Production verification confirmed the homepage HTML, CSS and PNG asset are live. No Nginx/env/systemd/Diagnosis API/database/code/AI/B4 change occurred.

- 2026-06-18 (Codex): Completed the Diagnosis Beta invite-code public launch. Production Diagnosis API now runs release `8e089c5bcf68086c787a3cafc58ba358d92e1ee1` with `previous` at `e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`; homepage invite-code entry is deployed; Nginx exact Beta/API routes proxy to the backend Cookie-session boundary without Basic Auth for ordinary testers; `ENABLE_BETA_CODE_ACCESS=true`; five real `beta-tester` codes are active and five orphan codes from a failed generation attempt are revoked. The root-only plaintext code file was deleted after the user saved the codes. Service is `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` loopback-only, homepage and `/diagnosis/` return `200`, `/diagnosis/beta/` without Cookie redirects to `/#diagnosis-beta-entry`, and provider/metadata/review remain `1 / 2 / 0`. No Diagnosis POST, DeepSeek/AI call, B4 T0 start or analytics repair occurred.

- 2026-06-18 (CodeBuddy): Created `CODEX.md` as a symlink to `AGENTS.md` so Codex auto-loads project rules. Synced `.claude/skills/` with `.agents/skills/` — the `.claude/` copy was missing `framespark-target-mode`; both directories now contain all 5 project skills. No code, server, deploy, or AI call changes.

- 2026-06-18: Implemented the repository-side Phase 4D backend boundary fix after production Nginx lacked `auth_request`. When `ENABLE_BETA_CODE_ACCESS=true`, Diagnosis API can now protect and serve exact Beta static routes with the page-scoped invite session cookie and can derive `/api/diagnosis/` Beta identity from the API-scoped session cookie before the existing identity guard. Existing Basic Auth identity-header compatibility remains for the current production boundary and rollback. Updated no-AI beta-access HTTP tests cover protected Beta static files, wrong-scope cookies, API-cookie identity on a missing-material 400 path, revocation and zero provider calls. `npm --prefix diagnosis-api run check`, `test:beta-access`, `test:beta-access-frontend`, and `test:no-ai` passed. No server, Nginx, env, SQLite, real code, production POST, AI call, static deployment or B4 T0 action occurred.

- 2026-06-17: Phase 4D public invite-code migration stopped on an infrastructure blocker. Production Nginx does not support `auth_request`, so `nginx -t` failed with `unknown directive "auth_request"` before reload. The Beta include was restored to the prior Basic Auth hash, homepage invite-code entry was not deployed, Beta static `current` stayed on `9672664...`, the unreferenced attempted Beta release was quarantined, service stayed `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` loopback-only, `/diagnosis/beta/` no-auth stayed `401`, provider/metadata/review stayed `1 / 2 / 0`, and no real tester code, Diagnosis POST, AI call or B4 T0 occurred. The earlier direct no-cookie `site_total` edit also did not persist; `$http_cookie` is again present and remains a blocker.

- 2026-06-17: Attempted a minimal Phase 4D Cookie logging fix by changing the active Nginx `site_total` log format to keep the `cookie` JSON field but write an empty string instead of `$http_cookie`; backup is `/etc/framespark/backups/nginx-site-total-no-cookie/20260617T082123Z`. Initial `nginx -t` and reload passed, but the later Phase 4D attempt showed the panel-managed source file had reverted to `$http_cookie`, so this is not considered a durable fix. Homepage and `/diagnosis/` stayed `200`, `/diagnosis/beta/` no-auth stayed `401`, Diagnosis service stayed `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` loopback-only, provider/metadata/review stayed `1 / 2 / 0`, and no invite-code route/static deployment, real code, Diagnosis POST, AI call or B4 T0 occurred.

- 2026-06-17: Completed Phase 4D.1 read-only production precheck and stopped before public invite-code changes. Production remained healthy on release `e16d699...`: service `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` loopback-only, homepage and `/diagnosis/` `200`, `/diagnosis/beta/` no-auth `401`, public beta-access/internal routes still static HTML fallback, access DB active code count `0`, provider/metadata/review `1 / 2 / 0`. Red blocker: the effective Nginx `site_total` log format includes `$http_cookie`, which would risk logging invite-code session cookies after Phase 4D. No file/env/Nginx/service/DB/static change, reload, POST, AI call, real code or B4 T0 occurred.

- 2026-06-17: Added the Phase 4D invite-code public-boundary plan. It splits the next risky step into read-only confirmation, static artifact preparation, Nginx invite-code/session boundary changes, internal no-AI validation, post-reload checks and rollback. It explicitly keeps real tester code creation, Diagnosis POST, AI calls, invitations and B4 T0 out of Phase 4D. No server connection, deployment, Nginx reload, env change, real code, POST or AI call occurred.

- 2026-06-17: Completed Diagnosis Beta Phase 4C backend-only validation. Production now has `ENABLE_BETA_CODE_ACCESS=true` for loopback-only app routes, while Nginx still keeps the public Beta path behind Basic Auth and does not expose functional invite-code routes. One internal test verify/session path succeeded and was revoked; all internal test code records are revoked, active code count is `0`, and no real tester code exists. Service stayed `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` loopback-only, Nginx/htpasswd unchanged and not reloaded, provider/metadata/review stayed `1 / 2 / 0`, no production diagnosis POST, AI call, homepage deploy, Beta static deploy, invitation or B4 T0 occurred.

- 2026-06-17: Completed Diagnosis Beta Phase 4B. Production env now contains distinct root-only Beta access HMAC secrets and `ENABLE_BETA_CODE_ACCESS=false`; `/var/lib/framespark-diagnosis/access/beta-access.sqlite` exists as `framespark-diagnosis:framespark-diagnosis 0600` with schema `user_version=1` and code count `0`. The service restarted once and is `active/running/enabled`, `NRestarts=0`, ready/health OK, `8788` remains loopback-only, homepage and `/diagnosis/` remain `200`, `/diagnosis/beta/` no-auth remains `401`, Nginx/htpasswd were unchanged and not reloaded, provider/metadata/review stayed `1 / 2 / 0`, sensitive journal matches were zero, no real access code, production POST, AI call, B4 T0 or Phase 4C/4D launch occurred.

- 2026-06-17: Deployed the glibc-compatible Diagnosis API backend release `e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf` from the fixed `ubuntu-22.04` artifact. The artifact passed local and server staging SHA/manifest checks, loaded `better-sqlite3` successfully on production, and replaced `current`; `previous` now points to `d722fc3...`. Service is `active/running/enabled`, `NRestarts=0`, ready/health OK and `8788` remains loopback-only. Homepage and public `/diagnosis/` remain `200`, `/diagnosis/beta/` no-auth remains `401`, Nginx/htpasswd were unchanged and not reloaded, provider/metadata/review stayed `1 / 2 / 0`, sensitive journal matches were zero, no env/HMAC key/real access code/production POST/AI call/B4 T0/Phase 4 launch occurred.

- 2026-06-17: Fixed the Diagnosis API release artifact build path after Phase 4B exposed a glibc mismatch. The GitHub Actions workflow now builds on `ubuntu-22.04` instead of `ubuntu-latest`, release manifests record OS/glibc/build-runner metadata, the builder refuses glibc newer than production `2.35`, and the server verifier rejects artifacts whose glibc is newer than the target server. The current `d722fc3...` production release remains healthy with Beta access disabled but must not be reused for Phase 4B. No server connection, deployment, env, SQLite, HMAC key, Nginx change, POST, AI call, real code, B4 T0 or Phase 4 action occurred.

- 2026-06-17: Completed Diagnosis API Phase 3 retry 2.1 backend deployment using the prebuilt GitHub Actions artifact. Production `current` now points to `d722fc3ed06ce6908a8936390455def8f735913e`, with `previous` at `683dea7fa98848cc40829b825cf4209692b7abe4`; service is `active/running/enabled`, `NRestarts=0`, ready/health OK and loopback-only on `8788`. Nginx/htpasswd were unchanged and not reloaded, Basic Auth remains the Beta boundary, `ENABLE_BETA_CODE_ACCESS` is absent/false, no HMAC key, real access code, beta access schema, production POST, AI call, B4 T0 or Phase 4 action occurred.

- 2026-06-17: Added the manual GitHub Actions workflow `Build Diagnosis API release artifact` for Diagnosis API server release artifact generation. It runs on `ubuntu-latest` with Node 20, `contents: read`, no secrets, no deployment, and uploads the tarball, manifest and `SHA256SUMS` as `diagnosis-api-release-<sha>` for 7 days. Documentation now states that artifact generation is not deployment; server verification and Phase 3 retry require a separate plan. No server connection, production env, SQLite, HMAC key, restart, Nginx change, real access code, POST, AI call, B4 T0 or Phase 4 action occurred.

- 2026-06-17: Added repository-only tooling for offline Diagnosis API server release builds. The new scripts create a Linux Node 20 diagnosis-api tarball with production `node_modules`, manifest and SHA-256 checks, verify artifacts in server staging without `npm ci`, and document a Docker `linux/amd64` builder flow. Deployment docs now direct Phase 3 to use prebuilt Linux artifacts. No server connection, deployment, env, SQLite, HMAC key, restart, Nginx change, real code, POST, AI call or B4 T0 action occurred.

- 2026-06-16: Recorded the Diagnosis Beta Phase 3 retry 2 red-light incident and updated the next deployment strategy. The failed attempt at `74a3605c5536943cf6aa68d44ff301e1ec1c2560` did not switch `current`, modify env, initialize SQLite, write HMAC keys, restart Diagnosis, change/reload Nginx, execute POST, call AI, create real codes or start B4 T0. Production recovered after Tencent Cloud restart with `current` still on `683dea7...`, unchanged env/systemd/Nginx/htpasswd, provider/metadata/review `1 / 2 / 0`, and failed build artifacts quarantined. Next Phase 3 must use a same-architecture Linux prebuilt artifact with bundled `node_modules`; production-host native dependency builds are blocked. Analytics reboot failure is recorded as a separate issue.

- 2026-06-16: Split Diagnosis Beta frontend access-code tests from the diagnosis-api-only server release check. Added `npm run test:server-release` for backend release validation and documented that `test:beta-access-frontend` requires repository-root static files and belongs to complete-repository/Phase 4 validation. No business code, API, SQLite schema, homepage, Beta page, Nginx, systemd, env, server, POST, AI, real code or B4 action changed.

- 2026-06-16: Fixed the release-safety issue that stopped Diagnosis Beta Phase 3 before deployment. `test-diagnosis-log-version.js` now uses the active `DIAGNOSIS_DATA_DIR` or a temporary data directory instead of assuming writable `logs/diagnosis` under the immutable release tree. Added `DIAGNOSIS_BETA_PHASE3_LOG_TEST_FIX_2026-06-16.md`. No production logger, deployment config, SQLite schema, Beta access API, homepage, Beta static page, Nginx, systemd, env, server, POST, AI, real code or B4 action changed.

- 2026-06-15: Added the default-off Diagnosis Beta access-code foundation: pinned SQLite dependency, hash-only code records, transactional max-use consumption, scoped 24-hour sessions, lifecycle revocation, persistent verification limits, loopback session validation, redacted management CLI and full no-AI tests. The eventual cohort is five people with one new code each; no real code, homepage/Beta UI, Nginx, server, htpasswd, production POST, AI, deployment, invitation or B4 T0 action was included.

- 2026-06-12: Executed Diagnosis Beta Stage A2 at locked SHA `683dea7fa98848cc40829b825cf4209692b7abe4`. Installed and froze a new immutable release, confirmed `qs@6.15.2`, zero production audit findings, and all approved V1/MVP no-AI checks, then atomically selected it through `current` while retaining `f4451587...` as `previous`. The service remains inactive/disabled, `8788` remains unused, env and Nginx hashes are unchanged, no key was written, no real AI ran, and no functional Beta/API route was opened.
- 2026-06-12: Updated the transitive production resolution from `qs@6.15.1` to security patch `6.15.2`. Only the lockfile package version, URL and integrity changed; `package.json`, Express/body-parser versions and business logic remained unchanged. Production audit now reports zero vulnerabilities, and all V1 plus MVP input/rate-limit/DTO/fail-closed/DOCX/retention/HTTP no-AI checks passed. No server connection, installed-release mutation, service/Nginx action, AI call or public Beta/API opening occurred.
- 2026-06-12: Reviewed the single Stage A moderate production audit finding. It is `qs@6.15.1`, a transitive Express/body-parser dependency affected only when `qs.stringify` uses comma arrays plus `encodeValuesOnly` with null/undefined entries. Diagnosis API and the installed framework paths use `qs.parse`, so the vulnerable operation is not reachable in the current runtime path. `qs@6.15.2` is the patch-level fix and should be handled in a separate reviewed immutable release. No dependency, lockfile, code, server, key, service, Nginx, AI, or public route changed.
- 2026-06-12: Executed Diagnosis Beta controlled deployment Stage A at locked SHA `f4451587f31fc31c5d49b243f0faf76e28e273e0`. Created the dedicated no-login identity, release/current and external data layout, installed production dependencies as the service user, passed all approved no-AI checks, installed a non-secret root-only env and statically verified systemd unit, then stopped. The service remains inactive/disabled, the real provider key is absent, port `8788` has no listener, Nginx remained hash-identical, analytics stayed on `8787`, no Basic Auth or Beta/API route was created, and no real AI ran. Execution evidence is in `DIAGNOSIS_BETA_DEPLOY_STAGE_A_2026-06-11.md`.
- 2026-06-11: Recorded the user's six Diagnosis Beta confirmations covering legal/privacy, external AI processing, retention, Basic Auth, AI cost controls and rollback window. Added a 60-minute post-deployment observation requirement, red/yellow/green reporting, immediate red-light stop/rollback rules and a one-call fictional-material limit for any future production AI smoke. This permits controlled deployment execution planning only; no server connection, credential, deployment, AI call or public opening occurred.
- 2026-06-11: Updated the public-site footers to retain `沪ICP备2026021671号` and add the approved public security filing `沪公网安备31011502406316号` as a link to the official MPS filing query. No filing icon existed locally, so no external asset was downloaded. No diagnosis/Beta code, server configuration, deployment, AI call or public Beta/API opening occurred.
- 2026-06-11: Added `DIAGNOSIS_BETA_PRE_DEPLOY_CHECKLIST_2026-06-11.md` with human sign-off gates for legal/privacy, Basic Auth, AI budget, server execution, Nginx/systemd, rollback and first-day observation. Deployment, one-call real-AI smoke and invitation distribution have separate Go/No-Go conditions, and any missing required evidence defaults to No-Go. No credential, server connection, configuration change, deployment, AI call or public route opening occurred.
- 2026-06-11: Corrected all ten repository-draft blockers from the Diagnosis Beta configuration review: full candidate-range review, unprivileged npm, isolated no-AI test data, idempotent service identity, exact env/auth/data/current checks, a hard Nginx stop, hidden-path denial, transactional rollback, analytics backend verification and provider-key placeholder rejection. Added `DIAGNOSIS_BETA_CONFIG_FIX_REVIEW_2026-06-11.md`. The shell files remain non-executable and exit before command bodies; no server command, credential, deployment, service action, Nginx change, AI call or public route opening occurred.
- 2026-06-11: Reviewed the repository-only Diagnosis Beta systemd, Nginx, env, deployment and rollback drafts. Core isolation/authentication directions passed, but ten execution blockers were recorded in `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_REVIEW_2026-06-11.md`, including root npm execution, incomplete commit-range review, production-data test pollution, hidden-file handling and rollback/analytics verification. The next allowed phase is human confirmation and checklist preparation only. No draft, business code, server configuration, credential, service, Nginx runtime, AI call or public route was changed.
- 2026-06-11: Added repository-only Diagnosis Beta deployment configuration drafts for systemd, Nginx, production env placeholders, deployment commands and rollback commands, plus `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_DRAFT_REVIEW_2026-06-11.md`. Both shell drafts exit before all command bodies. The drafts preserve the frozen public page and analytics proxy, contain no real key or credential, and were not applied to any server. No deployment, service action, Nginx reload, real AI call or public route opening occurred.
- 2026-06-11: Completed the approved Tencent Cloud read-only Diagnosis Beta precheck and recorded it in `docs/diagnosis/DIAGNOSIS_BETA_SERVER_READONLY_PRECHECK_2026-06-11.md`. Node/npm are available, `8788` is free, analytics remains on `8787`, and no diagnosis/Beta/API/health Nginx exposure exists. The dedicated user, release/current layout, env, data, Basic Auth file and systemd unit are all absent. No credential content was read and no server write, service action, Nginx reload, deployment, AI call or public route opening occurred.
- 2026-06-11: Added the archived Diagnosis Beta server deployment plan and repository-only dry-run review. A fresh fetch confirmed clean local `HEAD` and `origin/main` at full SHA `5d12fb7c064e0d0a57bb4d8cfb60cbf2cd166cac`; future prechecks must fetch and relock the SHA. The review approved only a server read-only precheck and documented remaining env/auth ownership, data permission, npm path, active Nginx, method restriction and rollback gates. No server command, deployment, AI call, credential creation, public API or Beta route was executed.
- 2026-06-10: Completed V1 Final Patch 5c with exactly 6 DeepSeek V4-flash provider calls. Sample 01 / 02 each had one controlled two-call `V1_FINAL_OUTPUT_UNSAFE` execution, then one accepted one-call structured final result with `complete_final`, maturity B, `revise_then_reassess`, no fallback, and no accepted-output high-interpretation or promise signal. Sample 03 remained `stop_d0 / LOW_INFORMATION` without AI. No full report, full sample, key, public entry, or deployment change was added.
- 2026-06-10: Implemented V1 Final Patch 5b. The final prompt now emits only `v1-final-structure-1`; final normalization inherits basic/advanced context, validates source evidence and rewrite safety, retries one repairable failure once, and raises `V1_FINAL_OUTPUT_UNSAFE` after a second failure. Timeout is not retried. No-AI tests confirm old fields and pipeline fallback remain stable; public entry and deployment remain unchanged.
- 2026-06-10: Implemented V1 Final Patch 5a structure and safety foundation. Added the `v1-final-structure-1` contract, controlled enums, strict source-evidence and rewrite-risk validation, server-template legacy mapping, and no-AI compatibility tests. The final prompt is not switched yet; V1 defaults, public entry, production API, and deployment remain unchanged.
- 2026-06-10: Completed V1 Final Patch 4b real regression with 6 DeepSeek V4-flash calls, three each for Sample 01 / 02. All runs used the four-part diagnostic suggestion format, reached `complete_final`, and had no JSON retry or fallback. Patch 3 guards remained stable, but both samples still received concrete plot, rule, scene-expression, or character-background proposals in all three runs. Sample 03 remained `stop_d0 / LOW_INFORMATION` without AI. Added `docs/diagnosis/V1_FINAL_PATCH4B_REAL_REGRESSION_2026-06-10.md`; no code, prompt, schema, public site, internal UI, or deployment changes were made.
- 2026-06-10: Implemented V1 Final Patch 4 prompt constraints against story rewriting. Final suggestions must now use problem / impact / modification direction / material needed, while concrete plot beats, turns, scenes, dialogue, endings, motivations, and backstory proposals are forbidden. Added static no-AI Patch 4 regression coverage and `docs/diagnosis/V1_FINAL_PATCH4_PLAN_2026-06-10.md`. No real AI, schema, basic, advanced, gatekeeper, public site, internal UI, or deployment changes were made.
- 2026-06-10: Completed the V1 Final Patch 3b real regression with 6 DeepSeek V4-flash calls, three each for Sample 01 / 02. All runs reached `complete_final` with no JSON retry or fallback. Sample 01 no longer emitted unsupported atonement/redemption terms; Sample 02 kept project organization below story issues and consistently focused on stone-chicken rules and the letter-burning turn. Both samples still showed concrete plot/content-writing suggestions, so grounding is improved but not fully resolved. Sample 03 remained `stop_d0 / LOW_INFORMATION` without AI. Added `docs/diagnosis/V1_FINAL_PATCH3B_REAL_REGRESSION_2026-06-10.md`; no code, prompt, public site, internal UI, or deployment changes were made.
- 2026-06-10: Implemented V1 Final Patch 3 prompt grounding and local regression coverage. Four DeepSeek V4-flash requests confirmed `complete_final`, revision-first nextStep, low-priority project organization, no retry/fallback, and no production/business promises; Sample 01 still emitted one `赎罪` occurrence before a final `patch3b` hard guard was added. `patch3b` local tests pass but needs a separately authorized real regression. No basic, advanced, gatekeeper, public site, internal UI, or deployment changes were made.
- 2026-06-10: Ran a two-call V1 final small test for Sample 01 / 02 and recorded summary-only evidence in `docs/diagnosis/V1_FINAL_SAMPLE_REVIEW_2026-06-10.md`. Both reached final with maturity B, `possible_after_revision`, no fallback, and no JSON retry; Sample 03 remained `stop_d0 / LOW_INFORMATION` with no AI call. Sample 01 showed `赎罪 / 救赎` interpretation signals, while neither sample showed detected production, commercialization, financing, selection, signing, or submission guarantees. No code, prompt source, public site, or deployment work changed.
- 2026-06-09: Prepared `docs/diagnosis/V1_ADVANCED_SAMPLE_REVIEW_2026-06-09.md` for human review. Sample 01 and Sample 02 reached advanced using 2 total DeepSeek V4-flash requests with `fallback=false` and no JSON retry; Sample 03 remained `stop_d0 / LOW_INFORMATION` with no advanced AI call. No full sample text, full report bodies, keys, raw provider responses, code, public site, or deployment changes were added.
- 2026-06-10: Reworked `docs/diagnosis/V1_ADVANCED_SAMPLE_REVIEW_2026-06-09.md` into a Chinese-first human review worksheet for advanced output review. It keeps Sample 01 / 02 observations, Sample 03 D0 boundary notes, blank scoring tables, and reviewer decision prompts. No real AI, code, prompt source, public site, or deployment work changed.
- 2026-06-09: Updated `internal/diagnosis-eval` result cards to show saved V1 diagnostics summary fields only. No full reportV1 body, full sample text, real AI run, service start, public site change, or diagnosis-api change.
- 2026-06-09: Added a summary-only V1 evaluation area to `internal/admin-console` using dev sample run summary fields. No real AI run, service start, public site change, or diagnosis-api change.
- 2026-06-09: Ran one minimal real V1 sample-run link verification. DeepSeek V4-flash required two calls because JSON retry was triggered, then saved V1 summary fields with fallback=false; diagnosis-eval and admin-console can read the saved summary. No public site, production API, or deployment change.
- 2026-06-09: Added `docs/diagnosis/V1_EVAL_STANDARD.md` for internal V1 report quality scoring, stage gates, fallback handling, and manual review criteria. No code, AI run, or deployment changed.
- 2026-06-09: Ran three non-private V1 basic sample runs for internal review. Total DeepSeek V4-flash calls: 4; sample 03 used one JSON retry; all three saved `hasReportV1=true`, `stageReached=basic`, and `fallback=false`. Added `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md` for manual scoring.
- 2026-06-09: Reworked `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md` into neutral human-review preparation material for the three V1 basic sample runs. Scores and final decisions remain blank; no full report or full sample text was added. No code, real AI, public site, or deployment work changed.
- 2026-06-09: Prepared human-review summaries for the three V1 basic sample runs in `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md`. Scores and final reviewer decisions remain blank; no real AI, code, public site, or deployment work changed.
- 2026-06-09: Localized the V1 basic sample review into a Chinese-first manual worksheet and added a short Chinese quick-review note to `V1_EVAL_STANDARD.md`. No real AI, code, sample-run data, public site, or deployment work changed.
- 2026-06-09: Added `docs/diagnosis/V1_PROMPT_REVISION_PLAN_2026-06-09.md` as a planning document for possible V1 basic follow-up work: D0/basic boundary, `nextStep`, generic suggestions, over-interpretation, and schema stability. No code, prompt source, real AI, or deployment work changed.
- 2026-06-09: Added `docs/diagnosis/V1_PROMPT_IMPLEMENTATION_PLAN_2026-06-09.md` after read-only inspection of V1 gatekeeper, prompts, stage decision, runner, schema/parser, and sample-run scripts. No diagnosis-api code, prompt source, real AI, public site, or deployment work changed.
- 2026-06-09: Implemented V1 Patch 1 for D0/basic boundary and `nextStep` stability. Sample 03-style low-maturity concepts now stop at D0 in no-AI regression; Sample 01/02 still pass gatekeeper to basic. No real AI, advanced/final prompt, public site, or deployment work changed.
- 2026-06-09: Implemented V1 Patch 2 for basic prompt grounding and suggestion specificity. Basic prompt now requires visible material evidence, uncertainty labeling, no unsupported atonement/theme elevation, concrete suggestions, and concrete `nextStep`. No real AI was run because `DEEPSEEK_API_KEY` was unavailable locally; no advanced/final prompt, public site, or deployment work changed.
- 2026-06-09: Ran V1 Patch 2 real regression on the three existing non-private basic samples. Total DeepSeek V4-flash requests: 3; Sample 02 used one JSON retry; fallback stayed false; Sample 03 remained `stop_d0 / LOW_INFORMATION`. Added `docs/diagnosis/V1_PATCH2_REAL_REGRESSION_2026-06-09.md` without full report bodies, full sample text, keys, or raw provider responses.
- 2026-06-09: Added project-level agent operating rules in `AGENTS.md` and a FrameSpark target-mode Skill under `.agents/skills/framespark-target-mode/`. The rules consolidate risk levels, stop conditions, AI-call limits, commit/push/deploy boundaries, public-site limits, diagnosis-api/V1 limits, internal-tool limits, and reporting format. No business code, real AI, or deployment work changed.
- 2026-06-03: Added V1 staged diagnosis architecture plan. V1 future mainline is staged, not a single all-in-one run; no business code changed and `ENABLE_DIAGNOSIS_V1` remains false.
- 2026-06-03: Added V1 staged commit 1 skeleton: pure gatekeeper and stage-decision modules with no-AI tests. Not connected to routes or production pipeline.
- 2026-06-03: Added V1 staged commit 2 skeleton: mock `v1StageRunner` with no-AI staged runner tests. Still not connected to production routes or legacy pipeline.
- 2026-06-03: Added future `ENABLE_V1_STAGED_RUNNER=false` switch and no-AI branch-condition checks. The staged runner is still not connected to `diagnosisPipeline`.
- 2026-06-03: Gated the no-AI staged runner inside `diagnosisPipeline` behind `ENABLE_DIAGNOSIS_V1 && ENABLE_V1_STAGED_RUNNER`; defaults remain false and legacy fallback remains.
- 2026-06-03: Added V1 basic, advanced, and final stage prompt drafts plus static prompt tests. They are not wired to runner or aiClient.
- 2026-06-03: Added `generateV1StageReport` in aiClient plus mock tests. It is not wired to runner or production pipeline yet.
- 2026-06-03: Gated real V1 staged prompts in `v1StageRunner` behind `ENABLE_V1_REAL_PROMPTS=false` and injected stage AI calls. No real AI was run.
- 2026-06-03: Added guarded V1 staged smoke script. Default run is mock/no-AI; real mode requires explicit `--real` and temporary V1 switches.
- 2026-06-03: Added fictional internal V1 staged smoke sample and wired the smoke script to read it without printing full text. Real AI smoke still has not been run.
- 2026-06-03: Ran one guarded V1 basic real smoke successfully against DeepSeek, with reportV1 and diagnostics present and no fallback. Then enhanced smoke output to show only safe summary fields.
- 2026-06-03: Extended V1 staged smoke to support mock-only `--max-stage=advanced` and `--max-stage=final`. Real advanced/final smoke remains blocked pending separate confirmation.
- 2026-06-03: Added protected single-stage real advanced smoke parameters using a mock basicReport dependency. Real advanced smoke has not been executed.
- 2026-06-03: First real advanced smoke stopped with `AI_REQUEST_TIMEOUT`; added `--smoke-minimal` requirement to shrink smoke input before any next real advanced attempt.
- 2026-06-03: Minimal real advanced smoke succeeded once with reportV1 and diagnostics present and fallback=false. Final real smoke is still unverified.
- 2026-06-03: Added protected single-stage real final smoke parameters with minimal mock basic/advanced dependencies. Real final smoke has not been executed.
- 2026-06-03: Minimal real final smoke succeeded once with reportV1 and diagnostics present, stageReached=final, promptVersion=v1-final-2026-06, model=deepseek-v4-flash, and fallback=false. No full text, report, raw response, or key was logged.
- 2026-06-02: Public unfinished product areas were frozen for launch posture: talent copy says not open, development project pages are `noindex`, and project detail URLs were removed from sitemap.
- 2026-06-02: Homepage platform cards gained unavailable-state prompts, and project cards now show a "details in design" prompt instead of navigating from the homepage.
- 2026-06-01: Mobile homepage optimization (`0eede24`) and subpage footer sync (`35e4ae1`) were pushed and deployed to Tencent Cloud by local sudo rsync.
- 2026-06-01: Collaboration workflow is being tightened for low-token multi-agent work: short reports, terminal-first read-only checks, verified deploy template, and high-risk Plan first.
- 2026-06-01: Homepage visual cleanup committed locally (`669e3dd`); rate-limit test hardening committed locally (`f78c44b`); low-token agent skill committed locally (`9eae74f`).
- 2026-06-01: Tencent Cloud production site still does not update automatically from GitHub push; short-term deploy path remains local rsync to `/www/wwwroot/framespark.cn`.
- 2026-05-30: Homepage visually redesigned — hero removed, nav simplified, footer restructured, home-kicker strip added.
- 2026-05-30: Diagnosis backend fully checked — 18/18 non-AI tests pass, rate-limit test bug fixed.
- 2026-05-30: materialRouter gap identified: no hybrid/mixed material type support.
- 2026-05-29: Tencent Cloud synced via rsync (server cannot reach GitHub HTTPS).
- 2026-05-29: Committed homepage hero compact animation (`94160f1`) and handoff update (`731040a`) — both pushed.

## 2026-06-01 (Codex — local session)

### Diagnosis V1 Staged Plan

- Added `diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md`.
- Documented `v1Gatekeeper`, `v1StageRunner`, `v1StageRouter`, `v1StageDecision`, `v1ReportAdapter`, and `v1EvaluationHooks`.
- Recorded route/guard hard-reject boundaries versus V1 D0 handling.
- Recorded the no-AI test checklist for D0, basic, advanced, final, and legacy fallback.
- No diagnosis business code was changed. `ENABLE_DIAGNOSIS_V1` remains false.

### Diagnosis API Production Plan

- Added `diagnosis-api/DEPLOYMENT.md` as the production connection plan.
- Added `diagnosis-api/DEPLOYMENT_RUNBOOK.md` as the manual production execution checklist. `diagnosis-api` is still not deployed to the formal site, and `/api/diagnosis` still has no verified production reverse proxy.
- Updated `.env.example` for `PORT=8788`, `ENABLE_DIAGNOSIS_V1=false`, `ENABLE_DEV_TOOLS=false`, and rate-limit env placeholders.
- Updated README to clarify production `DEEPSEEK_API_KEY`, V1 default-off state, and TXT/DOCX-only public parser support.
- Recorded that analytics-api owns `8787`; diagnosis-api should use `8788` if deployed.
- Short-term public upload format copy is now aligned to TXT/DOCX/paste only. PDF remains a separate future task; scanned PDF / OCR is out of current scope.
- Added diagnosis-api deployment script drafts for systemd install, Nginx proxy planning, and service uninstall. They were not executed; server still lacks diagnosis env, systemd service, and `/api/diagnosis` Nginx proxy.

### Production API Read-Only Check

- Checked production API state without changing files or server config.
- `/api/diagnosis` is not a live diagnosis API; it falls through to static 404 HTML behavior.
- `/diagnosis/` does not expose a public `/api/diagnosis` call and remains internal-test / upload-disabled.
- Nginx confirms `/api/analytics/` reverse proxy only; analytics-api listens on `127.0.0.1:8787`.
- No P0 public-site risk found. Public diagnosis must stay closed until `diagnosis-api` is separately deployed and proxied.

### Committed

- `0eede24` — `refine: improve mobile homepage layout`
  - File: `css/style.css`.
  - Mobile-only density pass for home-kicker, platform cards, project cards, and ecosystem cards.
- `35e4ae1` — `refine: align subpage footer layout`
  - Files: diagnosis, talent, project, and legal subpage HTML.
  - Subpage footers now match the home footer structure and use CSS cache-busting query strings.
- `669e3dd` — `refine: simplify homepage layout and brand presentation`
  - Files: `index.html`, `css/style.css`, `js/main.js`, `assets/brand/framespark-logo.svg`.
  - Hero removed, home-kicker retained, nav simplified, footer motto lowered in visual weight, project wheel-scroll disabled.
- `f78c44b` — `test: make rate limit route check resilient`
  - File: `diagnosis-api/scripts/test-rate-limit.js`.
  - Test script now uses regex matching for route order instead of indentation-sensitive string matching.
- `9eae74f` — `docs: add low-token agent mode skill`
  - Files: `.agents/skills/low-token-agent-mode/SKILL.md`, `.claude/skills/low-token-agent-mode/SKILL.md`.
  - Generic concise collaboration skill; project-specific skills are still pending.
- FrameSpark project workflow skills added in this session:
  - `framespark-handoff-check`
  - `framespark-static-site-release-check`
  - `framespark-deploy-check`
- `CLAUDE.md` created in this session to make Claude Code read handoff files and project Skills on startup.

### Notes

- Frontend visual tasks must check for smart quote pollution before commit.
- Tencent Cloud formal site is not automatically updated by GitHub push. Short-term deployment remains local rsync to `/www/wwwroot/framespark.cn`.
- Current AI collaboration target: less manual relay, shorter reports, terminal scripts for read-only checks, and Codex/Claude Code for scoped multi-file tasks.
- Diagnosis regression Skill remains deferred.

---

## 2026-05-30 (Claude Code — local session)

### Homepage Visual Redesign

Initial local redesign notes. This work was later cleaned up and committed in `669e3dd`.

**Removed:**
- Hero section (`<section class="intro">`) entirely deleted — no more hero banner of any kind.
- Hero compact animation (`setupHeroCompact`) removed from `js/main.js`.
- Sleeping flame decoration removed from `index.html`.
- Principle section (`<section class="principle">`) removed — motto moved to footer.
- `nav__tagline` ("讲好每一个故事") removed from nav.
- Project marquee wheel-scroll handler removed (`handleProjectWheel`, `stage.addEventListener('wheel', ...)`).

**Added:**
- `home-kicker` strip between nav and main: left `WHERE STORIES COME ALIVE`, right `讲好每一个故事`. Height 52px desktop, 44px mobile.
- Diamond logo added as `assets/brand/framespark-logo.svg` and later referenced from the nav brand mark.

**Changed:**
- Nav simplified to `项目 / 系统 / 生态` only (removed 简介 and 理念 links).
- Nav height: 76px → 72px.
- Platform section top padding reduced to `clamp(28px, 3.2vw, 40px)`.
- Platform card `min-height`: 460px → 280px; padding reduced.
- Platform card `platform-card__meta` margin-bottom: 54px → 20px (main reason cards were too tall).
- Section-head margin-bottom: 52px → 20px.
- Footer later settled as a low-weight brand/footer layout: brand and motto on the left, contact emails on the right, copyright + ICP in the bottom strip.
- Diagnosis page hero (`diagnosis-hero`) top/bottom padding significantly reduced.

## 2026-06-01

### Public Site Metadata Polish

- Added apple touch icon support and manifest PNG icon reference.
- Completed 404 page head metadata: canonical, noindex, OG/Twitter image, favicon, and apple touch icon.
- Rechecked robots, sitemap, canonical, OG/Twitter image, and public local-address residue.
- `site.webmanifest` MIME remains a server configuration todo; static files were not used to change Nginx.

**Bug found and fixed:**
- Claude Code's Edit tool was silently converting ASCII double quotes `"` to Unicode curly quotes `"` `"` in HTML attributes. This caused CSS class selectors to not match elements — `display:flex` and `justify-content:space-between` appeared to have no effect because the class was never applied. Affected `index.html` lines 60–68. Fixed by Python script replacing all curly quotes with ASCII.

### Tencent Cloud Deployment

- Server at `124.221.146.10` cannot connect to GitHub via HTTPS (port 443 blocked/timing out).
- Static files synced via `rsync` from local machine directly to `/www/wwwroot/framespark.cn/` using `sudo rsync --chown=www:www`.
- `/tmp/framespark-site` git repo on server is now 26 commits behind `origin/main`.
- Server-local analytics scripts were stashed before rsync and restored after.

### Diagnosis Backend Check (non-AI)

- `npm run check`: 40 files — all pass.
- 18 non-AI test scripts: 17/17 passed without fix; `test:rate-limit` had 1 failure.
- `test-rate-limit.js` failure was a test-script bug: used `indexOf("app.use(\n  '/api/diagnosis'")` (2-space indent) but `server.js` uses 4-space indent inside `createApp()`. Fixed by replacing with regex `/app\.use\(\s*['"]\/api\/diagnosis['"]/`. Production logic is correct.
- Backend live check (no AI): health ✅, empty-body rejection ✅, short-text guard ✅, feedback validation ✅, 404 ✅.

### materialRouter Gap Identified

- System picks exactly one material type per submission (winner-takes-all scoring).
- No "hybrid/mixed" material type exists — a document combining concept + character bio + worldbuilding will be classified as whichever type scores highest, and the others ignored.
- This is a known gap, not a bug. Decision to add a hybrid type is deferred to user.

---

## 2026-05-29 (Claude Code — local session)

### Committed

- Homepage hero compact animation — commit `94160f1`.
- Files changed: `index.html`, `css/style.css`, `js/main.js`.
- Behavior: first visit expands hero for ~1s then compresses with CSS transitions; return visits within session start already compact via sessionStorage; `prefers-reduced-motion` skips animation.
- No diagnosis-api changes. No `ENABLE_DIAGNOSIS_V1` change. Not yet pushed to GitHub.

### Synced

- Pulled `docs/ai-handoff/` 7 files from GitHub to local working tree via `git pull --ff-only`.
- Updated `PROJECT_STATE.md`, `NEXT_TASKS.md`, `CHANGELOG_AI.md` to reflect hero commit and current local state.

---

## 2026-05-29

### Added

- Created `docs/ai-handoff/PROJECT_CONTEXT.md`.
- Created `docs/ai-handoff/WORKING_RULES.md`.
- Created `docs/ai-handoff/PROJECT_STATE.md`.
- Created `docs/ai-handoff/NEXT_TASKS.md`.
- Created `docs/ai-handoff/CHANGELOG_AI.md`.

### Repository Observations

- Home page data is centralized in `js/site-data.js`.
- Home page rendering and project marquee logic are in `js/main.js`.
- The public site is a static site with partial data-driven modularity.
- `css/style.css` is currently a large shared stylesheet covering home, diagnosis, project detail, talent, legal, and responsive states.
- Diagnosis V1 work is already on GitHub:
  - `4e47d9b` — report V1 schema compatibility layer.
  - `1df8f0e` — gated V1 diagnosis pipeline.
  - `4020abaa` — V1 material classification prompt boundaries.
- `ENABLE_DIAGNOSIS_V1` remains false by default.
- `diagnosis-api` route / guard / material router logic still gates inputs before V1 can run.
- Internal diagnosis evaluation is already present through `internal/diagnosis-eval/`, `devSampleRuns`, and `sampleRunStore`.
- The synthetic-sample testing idea should extend the existing sample-run system rather than creating a separate platform.
- GitHub Pages deploys the static site only; the diagnosis API needs separate backend deployment planning.

### Updated Handoff Files

- Updated `PROJECT_CONTEXT.md` with broader module context.
- Updated `PROJECT_STATE.md` with public site, diagnosis, internal evaluation, and deployment state.
- Updated `NEXT_TASKS.md` with diagnosis V1, internal evaluation, synthetic sample, and public site modularization next steps.
- Updated `CHANGELOG_AI.md` with the repository-read summary.

### Notes

- Handoff files were added and updated directly through the GitHub connector.
- Each `create_file` or `update_file` call creates a separate commit through GitHub's contents API.
- If a single combined docs commit is preferred later, squash or reorganize from a local checkout.
- Local uncommitted files on the user's machine may still differ from GitHub, especially home hero animation changes.

## 2026-06-04

### Public Website Launch Readiness

- Tencent Cloud production now has the black-gold public website launch state.
- Static CSS/JS references on public pages now use `v=20260608` and have been deployed.
- Quark browser old-cache behavior was verified as resolved after the static asset version update.
- The public diagnosis page no longer loads the legacy `diagnosis/app.js` script.
- Diagnosis remains internal-test only: no upload entrance and no `/api/diagnosis` reference on the public page.
- Project pages remain `noindex`; sitemap does not include project URLs.
- No backend, Nginx, SSL, diagnosis-api, user-system, or V1 public-entry changes were made.

## 2026-06-05

### Internal V1 Diagnostics Summary

- Added dev sample run storage for V1 diagnostics summary fields.
- The change stores V1 summary metadata only and does not store full `reportV1` bodies.
- Existing legacy sample run fields remain unchanged.
- Added a no-AI regression test for V1 summary storage, missing diagnostics, fallback flags, and full reportV1 exclusion.
- No internal UI, public site, production route, deployment, or real AI execution was changed.

## 2026-06-10

### Diagnosis MVP Productionization Baseline

- Added invitation-Beta UI source under `diagnosis-api/beta-site/` for pasted text, TXT, and DOCX with privacy consent, product failure states, and public-result rendering. It is outside the static webroot and is not publicly routed.
- Removed the obsolete tracked `diagnosis/app.js` so a future static rsync cannot re-expose the retired public upload/API client.
- Added a public diagnosis DTO and public error mapping so internal V1 diagnostics, raw reports, model/prompt metadata, retries, fallback state, and internal paths are not exposed.
- Replaced the production staged branch's mock injection with the injectable real staged runner behind existing disabled-by-default V1 switches and fail-closed production checks.
- Added provider call budgeting, a persistent daily provider cap, account/IP/global/concurrency limits, request deadlines, origin checks, and trusted Beta identity handling.
- Hardened TXT/DOCX parsing and changed default product limits to 5 MB and 20,000 characters while preserving D0 for parseable low-information material.
- Reworked diagnosis logging to metadata-only by default, explicit review-consent retention, hashed identities, external data paths, restricted file modes, and expiry cleanup.
- Updated invitation-Beta privacy/terms copy and production deployment/runbook drafts for port `8788`, release symlinks, a dedicated service user, Basic Auth, `/ready`, and rollback.
- Added no-AI production-safety tests. No real AI, server command, deployment, public API exposure, or public upload restoration was performed.
- Pre-commit blockers were corrected: legal meta no longer describes the pages as placeholders, the diagnosis-depth test now verifies the frozen public page and isolated Beta client, and deployment scripts no longer mutate an immutable release or skip partial Nginx-location audits.
- Added no-AI DOCX archive safety, retention cleanup, and local HTTP integration coverage for public DTO redaction, access guards, rate limits, upload rejection, and fail-closed errors.

## 2026-06-12

### Diagnosis Beta Stage B0 Attempt

- Verified the locked `current` and `previous` releases, env file security, non-empty provider-key presence, free port `8788`, healthy analytics `8787`, frozen public Diagnosis page, and unchanged Nginx hash.
- Ran systemd static verification and daemon reload, then performed one authorized service start attempt.
- The start failed at `ExecStartPost` because the local readiness curl received connection refused before Node began listening; the service was immediately stopped and remains inactive/disabled.
- No provider call, diagnosis request, public route, Nginx change, sensitive log content, or listener on `8788` resulted from the attempt.
- Recorded the red-light outcome in the Stage A/B deployment record. A systemd readiness-probe correction requires separate review before any retry.

### Diagnosis Beta Stage B0.1 Readiness Correction

- Removed the readiness `ExecStartPost` from the repository unit draft and added bounded external readiness/health polling to both deployment command paths.
- Installed the corrected unit behind a verified backup and performed one authorized local-only start attempt. The application reached readiness on attempt 3 and passed health with no second startup error.
- A later journal check used a timestamp format rejected by the host, so the approved failure handler restored the original unit and stopped the service. No second start was attempted.
- Final state is inactive/disabled with no `8788` listener, zero provider calls, unchanged Nginx, healthy analytics/public site and no detected sensitive journal content.

### Diagnosis Beta Stage B0.2 Local Runtime Validation

- Replaced timestamp-based startup-log selection in the deployment draft with systemd InvocationID-scoped journal inspection.
- Installed the corrected unit and performed one authorized local-only start. Readiness passed on attempt 3, health passed, and the service remains active/running but disabled.
- Verified loopback-only `127.0.0.1:8788`, zero provider-call delta, zero restarts and zero sensitive-keyword matches in the invocation journal.
- Analytics, public pages, frozen Diagnosis, Nginx hash and absent Beta/API/feedback routes remain unchanged. No diagnosis POST or real AI call occurred.

## 2026-06-13

### Diagnosis Beta Stage B1 Protected Routes

- Added the invitation Basic Auth boundary for exact Beta HTML, `app.js`, `beta.css` and exact `POST /api/diagnosis/` access.
- Corrected the Beta homepage mapping from a file alias affected by inherited index handling to an exact `rewrite + root` mapping; no `try_files` was added.
- Verified correct, missing and incorrect authentication behavior, exact API method/path boundaries, the unchanged public site and analytics, loopback-only `8788`, zero restarts and zero provider-call delta.
- Feedback, backend health/readiness, real diagnosis requests, real AI and Stage B2 remain unopened.

### Diagnosis Beta Stage B2 Production Smoke

- Executed one separately authorized real-AI production smoke using reviewed fictional short material through the protected HTTPS Beta API, with automatic retry disabled.
- The single request returned HTTP 200 in approximately 67.9 seconds and produced a valid public DTO with no forbidden internal fields.
- Metadata reached Final with `complete_final`, `deepseek-v4-flash`, prompt version `v1-final-2026-06-patch5`, three provider calls and no fallback. The persistent provider-count delta matched the metadata.
- Diagnosis remained active but disabled, restart count stayed zero, `8788` remained loopback-only, and Nginx/public-site/analytics boundaries were unchanged.
- Sensitive log matches were zero. Temporary sample, headers and complete response artifacts were removed after verification; no second POST occurred.
- This smoke does not authorize invitation distribution, public uploads, feedback exposure or a later deployment stage.

### Diagnosis Beta Stage B3.1 Preparation

- Added the initial invitation rules, user notice, manual feedback template, deletion procedure and monitoring duty checklist for a future three-person Beta.
- Removed the Beta page's optional full-material review retention control and fixed all B3 submissions to `reviewConsent=false`.
- Documented that account limits are currently in-memory rather than persistent guarantees, and that diagnosis requests and provider calls require separate records.
- Recorded B3.2 blockers covering systemd boot continuity, production limits, duty ownership, account handling and legal review. No account, env, limit, service, Nginx, feedback, AI, invitation or deployment action was performed.

### Diagnosis Beta Stage B3.2b Production Limits And Enablement

- Committed and pushed the approved production limit values and systemd start-rate settings as `e3d0b544689c28f4cd9b0717a8ca59a16ab63cc4`.
- Created root-only server backups, installed the verified unit, and atomically changed only the six approved nonsecret env limits.
- Performed one controlled restart; readiness, health, `NRestarts=0`, loopback-only `8788`, unchanged provider usage and zero sensitive-log matches all passed.
- Enabled the service without `--now`; final state is `active/enabled`.
- Nginx, htpasswd, public pages, frozen Diagnosis, analytics and public routes were unchanged. No API POST, AI call, account creation, invitation or Beta-page deployment occurred.

### Diagnosis Beta B4 Observability Unblock And B3.2c Planning

- Recorded that the minimal independent Diagnosis timing log was successfully applied and validated: `nginx -t`, logrotate dry-run and one controlled reload passed.
- The no-POST validation returned HTTP `403` rather than the originally expected `401`; this is acceptable for B4 because the goal was safe timing-log write, and non-POST is rejected before the auth challenge.
- The timing entry was valid seven-field JSON and did not contain credentials, cookies, request body, user text, diagnostic content or secrets. No POST, provider call, account creation or invitation occurred.
- B4 blocker status is resolved, but B4 T0 remains not started and the 72-hour observation window has not begun. Recommended T0 is after the first real invited tester completes a real Diagnosis Beta submission and safe timing fields are confirmed.
- Added the B3.2c account plan for `beta-001`, `beta-002` and `beta-003`: append to the existing password file only, never use `htpasswd -c`, user enters passwords interactively, static-page verification only, and revocation uses a temporary copy plus atomic replacement.

### Diagnosis Beta Stage B3.2c Independent Accounts

- Created `beta-001`, `beta-002`, and `beta-003` while retaining `framespark-beta`; usernames were unique and no credential or account-to-person mapping was recorded.
- Preserved the password file as `root:www 0640`, used a same-directory temporary copy and atomic replacement, and retained root-only backup `/etc/framespark/backups/diagnosis-b3.2c/20260615T024833Z`.
- Correct credentials for each new account returned HTTP 200 on the static Beta page; missing and incorrect credentials returned HTTP 401.
- No diagnosis POST, AI call, Nginx reload, tester invitation, provider increment, metadata increment, review increment, or B4 T0 action occurred.

### Diagnosis Beta Stage B3.2d Invitation Page Deployment

- Deployed only the reviewed `index.html`, `app.js`, and `beta.css` from locked source `9672664f0f1770f3e45b27484bd2f924030e3781` into a new immutable Beta static release.
- Verified file hashes and permissions, then atomically switched `current` using an exclusive same-directory symlink with same-device validation. The previous release and root-only backup `/etc/framespark/backups/diagnosis-b3.2d/20260615T031340Z` were retained.
- Authenticated HTML, JavaScript, and CSS returned HTTP 200; missing and incorrect credentials returned HTTP 401.
- Verified fixed `reviewConsent=false`, the 60-90 second wait/no-repeat notice, anonymization and submission-rights notice, and AI-reference-only statement.
- Nginx, password file, service, public site, frozen Diagnosis and analytics boundaries remained unchanged. Provider calls stayed `0`, metadata stayed `1`, and review records stayed `0`.
- No diagnosis POST, AI call, real user material, tester invitation, B4 T0, or B3.2e action occurred.

## 2026-06-15

### Diagnosis Beta Access Phase 2

- Added the repository-only homepage access-code entry with password masking, empty-only validation, submission locking, fixed-path success navigation and generic safe failures.
- Added Beta-client handling that returns to the homepage entry only for the stable `BETA_ACCESS_REQUIRED` session-expiry response.
- Updated privacy and terms for transient access codes, maximum 24-hour credentials, no account/profile system and no default full-material retention.
- Added no-AI frontend tests and updated cache versions. No deployment, server/Nginx change, production POST, AI call, real code generation, invitation or B4 T0 occurred.
