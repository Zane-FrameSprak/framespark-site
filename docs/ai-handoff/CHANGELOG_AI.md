# AI Changelog

## Recent Summary

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
