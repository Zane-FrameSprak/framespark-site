# AI Changelog

## Recent Summary

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
