# Project State

Last updated: 2026-05-29
Updated by: Claude Code (local)
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

As of 2026-05-29:

- Working tree is clean (no uncommitted files).
- Local `main` is ahead of `origin/main` by 1 commit (`94160f1`) — not yet pushed.
- `docs/ai-handoff/` 7 files are synced locally (pulled from GitHub this session).

Recent local commits not yet on GitHub:

- `94160f1` — `feat: add hero compact animation with session persistence`

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

## Public Site — Hero Animation State

Homepage hero compact animation is complete and committed locally:

- Commit: `94160f1` — `feat: add hero compact animation with session persistence`
- Files: `index.html`, `css/style.css`, `js/main.js`
- Behavior: on first visit, hero expands for ~1 second then compresses smoothly; subsequent visits within the same session start already compact (sessionStorage); `prefers-reduced-motion` users skip the animation entirely.
- Not yet pushed to GitHub.

## Important Local-State Note

Run `git status` before starting work. Do not assume GitHub reflects the current local state — local `main` may be ahead of `origin/main`.

## Current Safe Defaults

- Do not enable `ENABLE_DIAGNOSIS_V1` by default.
- Do not remove legacy diagnosis fields.
- Do not modify route / guard / materialRouter admission behavior without planning.
- Do not mix public site visual changes with diagnosis API changes.
- Do not push unless explicitly asked.
- Prefer updating `js/site-data.js` for public-site content changes before editing HTML structure.
