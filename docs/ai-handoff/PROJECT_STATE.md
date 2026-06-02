# Project State

Last updated: 2026-06-01
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

## Diagnosis System State

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

## Public Site Metadata State (2026-06-01)

- Public site metadata/icons have been tightened after launch: OG PNG, root favicon, apple touch icon, manifest icon references, and 404 head metadata.
- `site.webmanifest` is structurally valid, but production still serves it as `application/octet-stream`; this is a server MIME configuration todo and should not be fixed in static files.
- Public diagnosis remains in internal-test / not-open-for-public-upload state.
- Public site positioning is currently brand display plus internal-test preview. Diagnosis, talent, and project areas are not open product flows.
- Development project pages remain accessible as lightweight project files, but are marked `noindex` and removed from sitemap until their public status is firmer.
