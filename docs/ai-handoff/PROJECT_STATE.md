# Project State

Last updated: 2026-06-12
Updated by: Codex
Current branch: main
Repository: `Zane-FrameSprak/framespark-site`

## Current Repository Snapshot

The GitHub repository exists at `Zane-FrameSprak/framespark-site` and uses `main` as the default branch.

This is a lightweight product system, not only a static website. It currently includes:

- Public static site.
- Story diagnosis frontend.
- `diagnosis-api` backend.
- Internal control console.
- Diagnosis evaluation workspace.
- Logs, review queues, and sample-run storage.
- AI handoff documents.

## Local Working Tree State

As of 2026-06-01:

- Homepage mobile responsive optimization is committed and deployed: `0eede24` — `refine: improve mobile homepage layout`.
- Subpage footer alignment is committed and deployed: `35e4ae1` — `refine: align subpage footer layout`.
- Low-token agent mode and FrameSpark workflow skills are available under `.agents/skills/` and `.claude/skills/`.
- Current collaboration flow is being tightened: terminal scripts for read-only checks, editor/manual tools for single-file visual tweaks, Codex/Claude Code for scoped cross-file target tasks.
- Always run `git status` before new work.

## AI Handoff Files

Current handoff set:

- `docs/ai-handoff/PROJECT_CONTEXT.md`
- `docs/ai-handoff/WORKING_RULES.md`
- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`
- `docs/ai-handoff/CHANGELOG_AI.md`
- `docs/ai-handoff/ARCHITECTURE.md`
- `docs/ai-handoff/DECISIONS.md`

When Codex or Claude Code takes over, read the normal startup files first. For high-risk work, also read `ARCHITECTURE.md`, `DECISIONS.md`, and recent `CHANGELOG_AI.md` entries.

Additional AI workflow files:

- `CLAUDE.md`
- `.agents/skills/low-token-agent-mode/SKILL.md`
- `.claude/skills/low-token-agent-mode/SKILL.md`
- `.agents/skills/framespark-handoff-check/SKILL.md`
- `.claude/skills/framespark-handoff-check/SKILL.md`
- `.agents/skills/framespark-static-site-release-check/SKILL.md`
- `.claude/skills/framespark-static-site-release-check/SKILL.md`
- `.agents/skills/framespark-deploy-check/SKILL.md`
- `.claude/skills/framespark-deploy-check/SKILL.md`

`CLAUDE.md` gives Claude Code the startup rules for reading handoff files and using project Skills. `low-token-agent-mode` is the generic concise-collaboration skill. The three FrameSpark-specific skills cover handoff checks, static-site release checks, and Tencent Cloud deploy checks.

## Public Site State

The public site is static and already has a partial modular structure.

Current structure:

- `index.html`: public home page skeleton and mount points.
- `css/style.css`: shared visual styling for home page, diagnosis page, project pages, talent page, legal pages, and responsive states.
- `js/site-data.js`: content data for public home page.
- `js/main.js`: renders home page cards and project marquee behavior.
- `js/analytics.js`: anonymous analytics and click tracking.
- `projects/`: static project detail pages.
- `talent/`: static talent-platform development notice page.
- `legal/`: placeholder legal pages.

Recent public-site state:

- Mobile homepage density was tightened for `home-kicker`, platform cards, project cards, and ecosystem cards.
- Subpage footers now match the home footer structure and use CSS cache-busting query strings.
- Tencent Cloud production was updated by local sudo rsync, not by GitHub push.

Home page data areas:

- `FrameSparkData.projects`
- `FrameSparkData.platforms`
- `FrameSparkData.ecosystem`

Important modularity note:

- Project cards already support a `cover` field, but covers are currently empty / placeholder-based.
- Future project cards should be expanded through data fields such as `cover`, `badges`, `stage`, `status`, `logline`, `order`, `visible`, and `talentNeeds`.
- High-change public site areas are project cards, talent platform copy/status, and system/platform cards.
- Do not rewrite the public site into a frontend framework unless explicitly requested.

### Public Filing Footer (2026-06-11)

- The public-site footer displays the MIIT filing number `沪ICP备2026021671号`.
- Public security filing approval is complete. The footer now displays `沪公网安备31011502406316号` and links it to the official MPS filing query URL.
- No local public-security filing icon exists in the repository, so the current implementation uses a text link and does not download an external asset.
- This static compliance update does not deploy or open Diagnosis Beta, `/diagnosis/beta/`, or `/api/diagnosis/`.

## Diagnosis System State

### V1 Final Structure Revision (2026-06-10)

- Patch 4b confirmed that prompt-only prohibitions cannot reliably prevent concrete story writing in final output.
- The approved replacement is a structured `final_assessment` contract with server-side validation and template-derived legacy fields.
- Patch 5a adds the contract, enums, evidence validation, rewrite-risk validation, and compatibility mapping. It does not enable V1, change public routes, or deploy the API.
- Patch 5b switches only the final prompt and final-stage normalization to the structured contract. It permits one targeted repair retry, then raises `V1_FINAL_OUTPUT_UNSAFE` for existing pipeline fallback.
- Final timeouts are not retried. Basic, advanced, D0, legacy defaults, internal summary fields, public routes, and deployment state remain unchanged.
- Patch 5c used exactly six DeepSeek V4-flash provider calls. Sample 01 and Sample 02 each first exhausted the one-repair path and returned controlled `V1_FINAL_OUTPUT_UNSAFE`, then each produced one accepted structured final result without retry.
- Accepted Sample 01 output used motivation, causality, and ending-consequence blockers without unsupported atonement/redemption terms. Accepted Sample 02 output used rule and transition-setup blockers without a free-text rule or scene solution.
- Sample 03 remains `stop_d0 / LOW_INFORMATION` with no AI call. The safety boundary worked, but provider compliance remains variable; this is not public-readiness approval.
- The global schema remains `diagnosis-report-v1`; final structure version is `v1-final-structure-1`.
- Public diagnosis upload and production `/api/diagnosis` remain closed.

The following diagnosis V1 commits are on GitHub:

- `4e47d9b` — `feat: add diagnosis report v1 schema compatibility layer`
- `1df8f0e` — `feat: add gated diagnosis report v1 pipeline`
- `4020abaa` — `refine: clarify diagnosis v1 material classification rules`

Current diagnosis behavior:

- `ENABLE_DIAGNOSIS_V1` is controlled by `config.enableDiagnosisV1`.
- The default is still false: `process.env.ENABLE_DIAGNOSIS_V1 === 'true'`.
- When V1 is disabled, diagnosis uses the legacy pipeline.
- When V1 is enabled, the pipeline tries `generateUnifiedDiagnosisV1` first.
- If V1 fails, the code falls back to the legacy pipeline and builds a fallback `reportV1`.
- API responses still preserve legacy fields: `basicReport`, `finalReport`, and `report`.

V1 staged architecture direction:

- Future diagnosis work should move toward a staged V1 mainline, documented in `diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md`.
- V1 should not run every stage at once. It should stop at D0, basic, advanced, or final depending on stage decisions.
- `ENABLE_DIAGNOSIS_V1` remains false. The new staged direction is a plan only; no business code has been changed for it yet.
- Legacy fallback remains required until frontend, logs, review tooling, and internal evaluation are migrated.
- Do not start this migration by changing route, guard, or materialRouter behavior. Add runner skeletons and no-AI tests first.
- V1 staged commit 1 adds pure gatekeeper and stage-decision skeletons plus no-AI tests. These are not connected to production routes or legacy pipeline behavior.
- V1 staged commit 2 adds a mock `v1StageRunner` and no-AI staged runner tests. It is still not connected to production routes or legacy pipeline behavior.
- `ENABLE_V1_STAGED_RUNNER` now exists as a future pipeline switch and defaults to false. The staged runner is still not connected to production pipeline behavior.
- The staged runner branch is now gated inside `diagnosisPipeline` by both `ENABLE_DIAGNOSIS_V1` and `ENABLE_V1_STAGED_RUNNER`. Both defaults remain false, so legacy behavior is unchanged.
- V1 basic, advanced, and final stage prompt drafts now exist. They are not wired to `aiClient`, runner, pipeline, or production routes.
- `aiClient.generateV1StageReport` now exists for future V1 staged prompts. It is mock-tested and not wired to runner or production pipeline yet.
- `v1StageRunner` can now use injected stage AI calls only when `ENABLE_V1_REAL_PROMPTS=true`. The default remains mock/no-AI.
- `diagnosis-api/scripts/smoke-v1-staged-real.js` now exists as a guarded smoke harness. Default mode is mock/no-AI; real mode requires explicit `--real` plus temporary key and three V1 switches.
- `diagnosis-api/dev-samples/v1-staged-smoke-short-synopsis.txt` now exists as a fictional internal smoke sample. It is not real user material and is used by the smoke script without printing full text.
- First guarded V1 basic `--real` smoke succeeded once against DeepSeek with `reportV1=true`, diagnostics present, and no fallback. This only proves the basic-stage link, not diagnosis quality.
- The smoke script now prints a safer summary including stage, stageReached, decision, promptVersion, model, fallback, and latency without full text or full reports.
- The smoke script now supports mock-only `--max-stage=advanced` and `--max-stage=final` serial checks. Advanced/final real smoke is still blocked pending separate confirmation.
- The smoke script now has protected `--real-stage=advanced --confirm-real-stage=advanced` parameters for a future single-stage real advanced smoke. It has not been executed yet.
- First real advanced smoke stopped with `AI_REQUEST_TIMEOUT`. The smoke script now requires `--smoke-minimal` for real advanced and uses a shorter smoke input plus minimal mock basicReport.
- Minimal real advanced smoke succeeded once with `reportV1=true`, diagnostics present, prompt version `v1-advanced-2026-06`, model `deepseek-v4-flash`, and `fallback=false`. This does not validate full-input advanced quality.
- Minimal real final smoke succeeded once with `reportV1=true`, diagnostics present, stageReached `final`, prompt version `v1-final-2026-06`, model `deepseek-v4-flash`, and `fallback=false`. It used minimal mock basicReport and advancedReport dependencies and does not validate full final quality.
- User registration/login, project database, and talent-platform features are outside the current V1 smoke scope.

## Route / Guard / Router Risk

V1 pipeline smoke tests passed, but route-level behavior still needs product review.

Observed route-level issues:

- Some `non_story_material` inputs are rejected before they reach V1, so V1 does not generate `D0` in those cases.
- Very short story-like text can be rejected by `materialRouter` or `guard` before V1.
- Short screenplay fragments may be blocked by existing full-script length thresholds.
- `synopsis` and `prose_fiction` classification boundaries were refined in prompt rules, but need another real AI smoke test.

Current guard thresholds include:

- `full_script`: 800 chars.
- `synopsis`: 300 chars.
- `outline`: 300 chars.
- `fragment`: 300 chars.
- `concept`: 80 chars.

Do not change route admission behavior without a plan and user approval.

## Internal Control / Evaluation State

The internal tooling is more mature than a simple placeholder.

Known components:

- `scripts/start-internal-console.js` starts a local-only internal console at `127.0.0.1:8130`.
- `internal/admin-console/` provides the internal dashboard page.
- `internal/diagnosis-eval/` provides the diagnosis evaluation workspace.
- `diagnosis-api/src/routes/devSampleRuns.js` exposes dev-only sample-run APIs when `ENABLE_DEV_TOOLS=true`.
- `diagnosis-api/src/services/sampleRunStore.js` stores sample runs under `diagnosis-api/test-runs/sample-diagnosis/`.

The future idea of Codex generating synthetic samples, running them through the diagnosis system, and viewing results in the internal workspace should extend the existing sample-run system.

## Deployment / Runtime State

- `.github/workflows/pages.yml` deploys the static site to GitHub Pages on pushes to `main`.
- Existing project notes indicate the formal public site may be served from Tencent Cloud / Nginx, not GitHub Pages.
- Pushing to GitHub may not automatically update the production server unless a separate sync/deploy process exists.
- `diagnosis-api` is not deployed by GitHub Pages and needs separate backend deployment planning.

## Production API State (2026-06-02)

- `/api/diagnosis` is not a live diagnosis JSON API in production. Current request behavior falls through to the static site / 404 HTML path, so it must not be treated as deployed.
- `/diagnosis/` remains in internal-test / public-upload-disabled state and does not expose a public `/api/diagnosis` call.
- Nginx currently confirms only `/api/analytics/` reverse proxy to analytics-api.
- analytics-api listens on `127.0.0.1:8787`; `HEAD /api/analytics/event` returning 404 is not a P0 because the endpoint is intended for POST events.
- Before reopening public uploads, deploy `diagnosis-api` separately and add a verified `/api/diagnosis` Nginx reverse proxy.
- Diagnosis API production plan is now documented in `diagnosis-api/DEPLOYMENT.md`; recommended runtime port is `8788` to avoid the analytics-api `8787` port.
- Diagnosis API production runbook is now documented in `diagnosis-api/DEPLOYMENT_RUNBOOK.md`; it is a manual execution checklist, not an automatic deploy script.
- Public parser currently supports TXT / DOCX / pasted text. Short-term public copy must not promise PDF; internal dev parsing may support text PDF samples, but that is not public support.
- Server preflight confirms Node/npm are available, `/tmp/framespark-site/diagnosis-api` exists, `8787` is analytics-api, and `8788` is free. `framespark-diagnosis.service` and `/home/ubuntu/framespark-diagnosis.env` do not exist yet.
- Diagnosis deployment script drafts now exist under `diagnosis-api/scripts/`; they are not executed and do not reopen public uploads.

## Public Site — Current Homepage Structure (2026-05-30)

The hero section has been completely removed. Homepage top-to-bottom structure is now:

1. **Nav** (72px): diamond logo + 帧火花/FRAMESPARK left; 项目/系统/生态 right. No tagline in nav.
2. **home-kicker strip** (52px): `WHERE STORIES COME ALIVE` left (gold), `讲好每一个故事` right (muted serif). Between nav and main content.
3. **系统与平台** — first-screen primary content. Two platform cards immediately visible at 1440×900.
4. **开发中项目** — project marquee. Wheel-scroll disabled; left/right buttons still work.
5. **创作生态** — ecosystem grid.
6. **Footer** — brand and low-weight motto on the left, contact emails on the right, copyright/ICP in a separate bottom strip.

No hero animation. No sleeping flame. No principle section. `home-kicker` uses `max-width: 1440px; margin: 0 auto` inner wrapper aligned with nav.

**Known Edit tool issue:** Claude Code's Edit tool can convert ASCII `"` to Unicode curly quote characters in some contexts. This silently breaks HTML class attributes. Frontend visual tasks must check for U+201C, U+201D, U+2018, and U+2019 before commit.

## Tencent Cloud Deployment State

- Server: `124.221.146.10` (Ubuntu 22.04, 宝塔 Nginx).
- Webroot: `/www/wwwroot/framespark.cn/` — **not a git repo**, files owned by `www:www`.
- Git repo on server: `/tmp/framespark-site` — is a git repo but cannot pull from GitHub (HTTPS port 443 blocked on server side). Currently 26+ commits behind `origin/main`.
- Deploy method: `sudo rsync` from local machine directly to webroot. Run before any rsync: `ssh ubuntu@124.221.146.10 "cd /tmp/framespark-site && git stash push -u"` to preserve server-local analytics scripts.
- SSH login: `ubuntu@124.221.146.10` using `~/.ssh/id_rsa`.
- Current short-term deployment method is local `rsync` to `/www/wwwroot/framespark.cn/`. GitHub push does not automatically update the Tencent Cloud production site.

## Important Local-State Note

Run `git status` before starting work. Do not assume GitHub reflects the current local state — local `main` may be ahead of `origin/main`.

## Current Safe Defaults

- Do not enable `ENABLE_DIAGNOSIS_V1` by default.
- Do not remove legacy diagnosis fields.
- Do not modify route / guard / materialRouter admission behavior without planning.
- Do not mix public site visual changes with diagnosis API changes.
- Do not push unless explicitly asked.
- Prefer updating `js/site-data.js` for public-site content changes before editing HTML structure.

## Diagnosis MVP Productionization Baseline (2026-06-10)

- The repository now contains invitation-only Beta source under `diagnosis-api/beta-site/`; the existing public `/diagnosis/` preview page remains unchanged and does not link to it. Future Nginx may expose the source as protected `/diagnosis/beta/` only after authentication is active.
- The retired public client `diagnosis/app.js` has been removed from the repository to prevent it returning during a later static rsync.
- The Beta path is designed to be protected by Nginx Basic Auth. The API additionally requires a trusted `X-Framespark-Beta-User` identity in production and only accepts configured origins.
- Production startup is fail-closed: the real staged runner, three V1 switches, API key, loopback host, port `8788`, `/var/lib/framespark-diagnosis`, dev-tools-off, and safety limits must validate before readiness.
- Public diagnosis responses now use a dedicated DTO. Internal fields such as raw `reportV1`, prompt version, model, fallback, retry, provider routing, and latency are not returned to the Beta UI.
- V1 unsafe output or staged-runner failure is not presented as a successful legacy report in production fail-closed mode.
- Upload parsing is limited to pasted text, TXT, and DOCX with extension/MIME checks, UTF-8 checks, DOCX ZIP checks, 5 MB upload size, and 20,000-character product limit. PDF/OCR remains unsupported.
- Default logging stores only hashed identity and run metadata for 30 days. Full material/report retention requires separate review consent, is stored outside webroot, and expires after 14 days.
- Provider usage has a persistent daily cap; diagnosis requests also have account, IP, global, and concurrency limits for the initial single-instance Beta.
- Privacy and terms pages now include invitation-Beta disclosures, but still require human legal review before release.
- No diagnosis backend, Beta Nginx route, Basic Auth account, systemd unit, or public API has been deployed. No real AI was run for this implementation.

## Diagnosis Beta Deployment Dry-run Review (2026-06-11)

- After a fresh `git fetch origin main`, local `HEAD` and `origin/main` both resolved to `5d12fb7c064e0d0a57bb4d8cfb60cbf2cd166cac` with a clean worktree.
- The deployment candidate is no longer treated as a permanent pinned commit. Every server precheck or deployment must fetch again, require `HEAD == origin/main`, and record the current full SHA; a changed SHA requires renewed review.
- The archived server plan is recorded in `docs/diagnosis/DIAGNOSIS_BETA_DEPLOY_PLAN_2026-06-10.md`; the repository-only audit is recorded in `docs/diagnosis/DIAGNOSIS_BETA_DRY_RUN_REVIEW_2026-06-11.md`.
- Release/current, dedicated-user, external env/data, loopback `8788`, Basic Auth and rollback directions match the MVP plan. The shell drafts pass syntax checks but were not executed.
- Before any installation, manually verify env/auth file type and ownership, data permissions, the actual npm path, active Nginx location conflicts, static Beta method restrictions and previous-release/config backups.
- The next allowed action is a server read-only precheck. No SSH deployment command, installer, package install, symlink switch, service start/restart, Nginx reload, real AI call or public route opening is authorized.

## Diagnosis Beta Server Read-only Precheck (2026-06-11)

- Repository baseline was freshly verified at full SHA `efd9b46f6d5d1a566a38e94b796ecac471edf27c` with local `HEAD` equal to `origin/main`.
- Tencent Cloud has Node `v20.20.2`, npm `10.8.2`, curl, and an available port `8788`; analytics remains on loopback port `8787`.
- The diagnosis service infrastructure is not yet present: no dedicated user, `/srv/framespark/diagnosis-api`, release/current structure, production env, external data directory, Basic Auth file, or systemd unit exists.
- Active Nginx contains the existing `/api/analytics/` proxy and static-site locations only. No Beta page, diagnosis/feedback API, public health/readiness, wildcard CORS or diagnosis port conflict was found.
- The public webroot still contains only the frozen diagnosis page and does not contain Beta assets, diagnosis-api or internal directories.
- The server may advance only to repository-side deployment configuration draft generation. No resource creation, server write, service action, Nginx reload, AI call or public opening is authorized.

## Diagnosis Beta Deployment Configuration Drafts (2026-06-11)

- Repository-only drafts now exist under `deploy/diagnosis-beta/` for the systemd unit, authenticated Nginx locations, production env placeholders, deployment commands and rollback commands.
- The shell drafts exit unconditionally before their command bodies and are not executable deployment tooling. They exist only for line-by-line review.
- The drafts preserve the frozen public `/diagnosis/`, existing `/api/analytics/`, loopback `8788`, versioned release/current layout, external env/data paths and three consistently authenticated Beta locations.
- The env draft contains `DEEPSEEK_API_KEY=REPLACE_ME` only. The documented Beta header and log-redaction env names are deployment-contract notes; the application does not currently read them dynamically.
- Open review gates include auth-file ownership/mode, systemd effective environment and hardening compatibility, Nginx alias/symlink behavior, exact no-trailing-slash handling, active-config merge safety and rollback checksum values.
- The next allowed phase is configuration draft review only. No server connection, resource creation, deployment, Nginx reload, service action, real AI call or public opening is authorized.

## Diagnosis Beta Configuration Review (2026-06-11)

- The configuration review is recorded in `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_REVIEW_2026-06-11.md` against repository baseline `fb86638499e3a817f7873a3c66acb40d4d62c579`.
- Core systemd paths, loopback binding, restart policy and hardening direction pass draft review. All three Nginx Beta locations share Basic Auth and preserve the frozen public page and analytics location.
- The env draft contains only the required placeholder key and approved production limits. The identity-header and log-redaction names remain documentation contracts, not dynamically read controls.
- Execution is blocked pending full commit-range review, unprivileged dependency installation, isolated no-AI test data, idempotent user handling, post-install permission checks, a hard Nginx manual stop, hidden-file protection, transactional rollback config handling, real analytics-backend verification and independent placeholder rejection.
- The next phase may prepare a human confirmation and pre-deployment checklist only. Deployment, server writes, credential creation, service actions, Nginx reload, real AI and public Beta/API exposure remain prohibited.

## Diagnosis Beta Draft Blocker Fix Review (2026-06-11)

- The ten configuration-review blockers are corrected at the repository-draft level and mapped to evidence in `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_FIX_REVIEW_2026-06-11.md`.
- Candidate packaging now requires full approved-base-to-candidate review; npm lifecycle code and no-AI tests run as the unprivileged service identity with isolated fictional test data, then the release becomes root-owned and service-group-readable without runtime write access.
- Service identity creation is idempotent. Env, auth, data and `current` paths have non-symlink and exact metadata checks, including non-empty provider-key and auth-file validation without printing content.
- Nginx mutation is blocked by an explicit status-75 stop, the Beta alias rejects hidden paths, and rollback restores the active config if validation or reload fails.
- Rollback verifies the analytics listener and active proxy configuration. Systemd hardening still requires exact target-host verification rather than broad weakening.
- Both shell files remain non-executable drafts with unconditional status-64 exits. The next phase is human confirmation and pre-deployment checklist preparation only; no server action or public opening is authorized.

## Diagnosis Beta Pre-deploy Checklist (2026-06-11)

- `docs/diagnosis/DIAGNOSIS_BETA_PRE_DEPLOY_CHECKLIST_2026-06-11.md` now provides the human sign-off checklist for legal/privacy, invitation access, AI budget, server execution, Nginx/systemd review, rollback and first-day observation.
- Deployment, one-call real-AI smoke and invitation distribution are separate Go/No-Go gates. Missing evidence or any unchecked required item defaults to No-Go.
- The checklist requires a fresh full-SHA lock, independent reviewers, exact env/auth/data/release permissions, protected three-location routing, frozen public `/diagnosis/`, analytics preservation and rollback evidence.
- This remains documentation only. No server connection, credential creation, configuration change, deployment, AI call or public opening has occurred.

## Diagnosis Beta Human Confirmation (2026-06-11)

- User confirmation is recorded in `docs/diagnosis/DIAGNOSIS_BETA_HUMAN_CONFIRMATION_2026-06-11.md` for six decision areas: legal/privacy, external AI processing, retention, Basic Auth, AI cost controls and rollback window.
- The user has a continuous 60-minute post-deployment observation window and can request immediate rollback when a red-light check fails.
- A future controlled deployment must produce a red/yellow/green report. Any red light pauses the sequence and requires rollback when runtime or routing has changed.
- A production real-AI smoke remains limited to one call using fictional short material. It is not authorized until deployment-time no-AI checks are green.
- No access may be distributed to invited users until the 60-minute observation is complete with all applicable checks green and rollback validation passed.
- The next permitted phase is controlled deployment execution planning only. No server connection, deployment, credential creation, AI call or public opening occurred in this documentation step.

## Diagnosis Beta Controlled Deployment Stage A (2026-06-12)

- Stage A is recorded in `docs/diagnosis/DIAGNOSIS_BETA_DEPLOY_STAGE_A_2026-06-11.md`; the filename follows the approved task while the document records the actual 2026-06-12 execution date.
- Candidate `f4451587f31fc31c5d49b243f0faf76e28e273e0` is installed under `/srv/framespark/diagnosis-api/releases/` with an exact `current` symlink, a dedicated no-login user, external data directory, root-only non-secret env, and a verified systemd unit.
- All four approved MVP no-AI test groups passed. The release is service-readable but not service-writable; temporary build/upload directories were removed.
- The env intentionally omits the real DeepSeek key. The service is inactive and disabled; no `daemon-reload`, enable, start, restart, real AI request, or production health check occurred.
- Active Nginx remained hash-identical to its pre-stage state. No Basic Auth, Beta/API/feedback/health route, public upload entry, or listener on `8788` exists; analytics remains on `127.0.0.1:8787`.
- Current stop state: the user must add the provider key directly on the server using a non-echoing method. Service activation and all later stages require separate authorization.

## Diagnosis Beta Production Dependency Audit Review (2026-06-12)

- The Stage A moderate audit finding is documented in `docs/diagnosis/DIAGNOSIS_BETA_NPM_AUDIT_REVIEW_2026-06-12.md`.
- The original finding affected transitive production dependency `qs@6.15.1` through `express@4.22.2` and `body-parser@1.20.5`.
- The defect requires `qs.stringify` with non-default comma-array and encode-values-only options plus null/undefined array entries. Diagnosis API and its installed Express/body-parser paths use `qs.parse`, so the vulnerable operation is not reachable in the current application.
- The repository lockfile now resolves `qs@6.15.2` without changing `package.json`, Express, body-parser, or business logic. Production audit reports zero vulnerabilities and all V1/MVP no-AI regression groups passed.
- The installed Stage A immutable release was not modified and still predates the patch. A future separately authorized deployment must build a new release from the patched commit rather than mutate the existing release.
- No server connection, service/key/Nginx change, real AI call, or public Beta/API opening occurred during the fix.

## Diagnosis Beta Controlled Deployment Stage A2 (2026-06-12)

- A fresh fetch locked server release candidate `683dea7fa98848cc40829b825cf4209692b7abe4`, containing the reviewed `qs@6.15.2` security patch.
- A new immutable release was installed as the dedicated service identity, then frozen as `root:framespark-diagnosis` and selected atomically through `current`. `previous` retains the old `f4451587...` release for rollback.
- Server-side `npm ls` resolves `qs@6.15.2`, production audit reports zero vulnerabilities, and all 18 approved V1/MVP no-AI commands plus syntax checks passed.
- The service remains inactive/disabled, `8788` remains unused, the env is unchanged and still lacks the real key, and Diagnosis journald remains empty.
- Nginx hash, analytics `8787`, the public website, and the frozen `/diagnosis/` page remain unchanged. No functional Beta/API/feedback/health route, Basic Auth, real AI call, or invitation opening exists.
- Current stop state: the user may add the provider key directly on the server using a non-echoing method. All service and routing actions still require separate authorization.

## Public Site Metadata State (2026-06-01)

- Public site metadata/icons have been tightened after launch: OG PNG, root favicon, apple touch icon, manifest icon references, and 404 head metadata.
- `site.webmanifest` is structurally valid, but production still serves it as `application/octet-stream`; this is a server MIME configuration todo and should not be fixed in static files.
- Public diagnosis remains in internal-test / not-open-for-public-upload state.
- Public site positioning is currently brand display plus internal-test preview. Diagnosis, talent, and project areas are not open product flows.
- Development project pages remain accessible as lightweight project files, but are marked `noindex` and removed from sitemap until their public status is firmer.
- Home platform cards now use unavailable-state prompts instead of opening real product flows; project cards show a light "details in design" prompt instead of navigating from the homepage.

## Public Website Launch Readiness (2026-06-04)

- The Tencent Cloud production site is now the black-gold public website for launch readiness.
- Current positioning: brand display site plus internal-test preview site.
- Home, diagnosis, talent, legal, and 404 pages have been manually checked with no obvious P0/P1 issues.
- The public diagnosis page remains an internal-test notice page: no upload controls, no `diagnosis/app.js`, and no `/api/diagnosis` reference.
- MVP pre-commit blocker fixes are present locally: legal meta alignment, frozen-page regression coverage, immutable-release deployment checks, partial Nginx-location auditing, DOCX safety tests, retention cleanup tests, and local HTTP integration tests. They are not committed, pushed, deployed, or publicly enabled.
- The talent page remains in preparing / not-open state.
- Project detail pages remain `noindex`; `sitemap.xml` does not include `projects/` URLs.
- Static CSS/JS references use `v=20260608` for cache busting; Quark old-cache behavior has been verified as resolved.
- Production webroot exposure check passed: no `.git`, docs, internal, backend, or scripts directories exposed; `.user.ini` is preserved.
- `site.webmanifest` MIME remains a server configuration todo and is not a launch blocker.
- Diagnosis V1 basic, advanced minimal, and final minimal real smoke checks succeeded, but V1 is not connected to the public entry.

## Internal V1 Diagnostics Summary State (2026-06-05)

- Internal V1 diagnostics integration phase 1 is implemented for dev sample runs.
- `diagnosis-api` dev sample run results now preserve V1 summary fields such as stage reached, decision, prompt version, model, fallback, latency, maturity, stage, next step, stop reason, and stage status.
- Full `reportV1` bodies are not stored in sample run results; this phase stores only summary fields for internal review.
- Legacy sample run fields remain intact for existing internal tooling.
- `internal/diagnosis-eval` now displays the saved V1 summary fields in result cards.
- `internal/admin-console` now has a V1 evaluation summary area that reads dev sample run summary fields when the local dev API is available.
- The internal UI remains summary-only: it does not show full `reportV1` bodies or full sample text.
- A minimal real V1 sample-run link check succeeded on 2026-06-09: DeepSeek V4-flash produced a basic-stage V1 summary, sample-run storage preserved the V1 summary fields, and both internal pages can read the saved fields.
- The link check used a fictional non-private short sample and did not expose the full AI report or full sample text in output.
- V1 report quality now has an internal scoring standard: `docs/diagnosis/V1_EVAL_STANDARD.md`.
- A 3-sample V1 basic internal evaluation batch was created on 2026-06-09. Review todo: `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md`.
- The V1 basic review document now contains neutral human-review summaries for all three 2026-06-09 sample runs, including metadata, concise AI judgment summaries, suggestion summaries, and reviewer focus points.
- Scores and final quality decisions are intentionally blank for manual review; the worksheet does not include full report bodies or full sample text.
- The current sample-review material is for human evaluation only. It does not authorize public upload, production `/api/diagnosis`, or broader V1 exposure.
- `docs/diagnosis/V1_PROMPT_REVISION_PLAN_2026-06-09.md` records the next planning targets: D0 gatekeeper / maturity detection, basic prompt specificity, stage decision / `nextStep`, and JSON schema stability.
- `docs/diagnosis/V1_PROMPT_IMPLEMENTATION_PLAN_2026-06-09.md` now maps those targets to concrete candidate files after read-only inspection. It recommends Patch 1 for D0/basic boundary plus nextStep, Patch 2 for basic prompt fidelity/specificity, and Patch 3 for tests/schema only if needed.
- V1 Patch 1 is implemented: low-maturity concept fragments now stop at D0 in the V1 gatekeeper, stage decision blocks supplement-material basic results from advancing, and V1 outputs have stable `nextStep` fallbacks.
- No real AI was run for Patch 1. No advanced/final prompts, public site, production API, Nginx, SSL, systemd, database, or public upload entry changed.
- V1 Patch 2 is implemented: the basic prompt now requires material-grounded judgments, uncertainty labeling for inference, no unsupported atonement/theme elevation, concrete suggestions, and concrete `nextStep`.
- V1 Patch 2 real regression is now recorded in `docs/diagnosis/V1_PATCH2_REAL_REGRESSION_2026-06-09.md`: Sample 01 no longer showed fixed atonement wording in checked fields, Sample 02 showed concrete-suggestion signals with one JSON retry, and Sample 03 remained `stop_d0 / LOW_INFORMATION`.
- Patch 2 regression used 3 DeepSeek V4-flash requests total. No full report, full sample text, key, advanced/final prompt, public site, production API, or deployment path changed.
- V1 advanced small test is now recorded in `docs/diagnosis/V1_ADVANCED_SAMPLE_REVIEW_2026-06-09.md`: Sample 01 and Sample 02 reached advanced with 2 total DeepSeek V4-flash requests, `fallback=false`, and no JSON retry; Sample 03 stayed `stop_d0 / LOW_INFORMATION` and made no advanced AI call.
- The advanced review document is now a Chinese-first human review worksheet. It keeps Sample 01 / 02 advanced observations, Sample 03 D0 boundary notes, reviewer decision blanks, and scoring blanks; it does not include full sample text, full reportV1 bodies, raw provider responses, keys, scores, or final quality judgments.
- No code, prompt source, public site, production API, internal UI, or deployment path changed during the advanced small test.
- V1 final small test is now recorded in `docs/diagnosis/V1_FINAL_SAMPLE_REVIEW_2026-06-10.md`. Sample 01 and Sample 02 each used one DeepSeek V4-flash final-stage request; both returned maturity B, `possible_after_revision`, `fallback=false`, and no JSON retry. Sample 03 remained `stop_d0 / LOW_INFORMATION` without an AI call.
- Final review observations include a possible over-interpretation signal in Sample 01 (`赎罪 / 救赎`), final-stage decision-format concerns in both samples, and no detected guarantee of production, commercialization, financing, selection, signing, or submission outcome.
- The final review is evidence for human evaluation only. It does not approve the final prompt, public diagnosis, product readiness, or deployment; no code or prompt source changed.
- V1 Final Patch 3 now tightens final prompt grounding, stage closure, B/C nextStep behavior, suggestion categories, project-file priority, and forbidden production/business promises. Prompt version is `v1-final-2026-06-patch3b`.
- Patch 3 used the full 4-call DeepSeek V4-flash budget. Both samples reached `complete_final`, used `possible_after_revision`, had no retry/fallback, and kept project organization below story/material work. Sample 01 still produced one `赎罪` occurrence before the final `patch3b` hard guard was added.
- Patch 3b real regression is now recorded in `docs/diagnosis/V1_FINAL_PATCH3B_REAL_REGRESSION_2026-06-10.md`. Sample 01 / 02 each used three final-stage DeepSeek V4-flash calls; all six returned `complete_final`, had no JSON retry or fallback, and kept project organization below story/material work.
- Sample 01 did not emit “赎罪 / 救赎 / atonement / redemption” in any of the three Patch 3b runs. Sample 02 consistently focused on the stone-chicken rules and letter-burning turn, although conversion status varied once.
- Both samples still produced concrete plot/content-writing suggestions in all three runs. Patch 3b fixed the named stage-closure and over-interpretation issues in this batch, but did not fully stabilize the prohibition against filling in story facts for the author.
- Sample 03 was rechecked without AI and remains `stop_d0 / LOW_INFORMATION`.
- V1 Final Patch 4 now constrains final output to diagnosis rather than story rewriting. Prompt version is `v1-final-2026-06-patch4`; it prohibits concrete plot beats, turns, scenes, dialogue, endings, motivations, and backstory proposals.
- Patch 4 requires every final suggestion to use a diagnostic structure: problem, impact, modification direction, and material needed. It keeps Patch 3 guards and does not change schema, basic, advanced, gatekeeper, public entry, or deployment state.
- Patch 4b real regression is recorded in `docs/diagnosis/V1_FINAL_PATCH4B_REAL_REGRESSION_2026-06-10.md`. Sample 01 / 02 each used three final-stage DeepSeek V4-flash calls; all six returned `complete_final`, had no JSON retry or fallback, and used the required four-part diagnostic suggestion format.
- Patch 4b preserved the Patch 3 guards, but did not reliably stop story rewriting. Both samples still received concrete experience, foreshadowing, scene-expression, rule-mechanism, or character-background proposals across all three runs.
- Sample 03 was rechecked without AI and remains `stop_d0 / LOW_INFORMATION`. No code, prompt, schema, public entry, or deployment state changed during Patch 4b.
- Project-level agent rules now exist in `AGENTS.md`, with a FrameSpark-specific target-mode Skill at `.agents/skills/framespark-target-mode/SKILL.md`. Future Codex/Agent tasks should use these as the stable operating boundary before relying on repeated long prompts.
- No public site, production API, Nginx, SSL, systemd, database, or public upload entry changed.
