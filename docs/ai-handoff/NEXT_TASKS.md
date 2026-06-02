# Next Tasks

Last updated: 2026-06-01
Updated by: Codex

## Now

- **Keep low-token workflow active** — routine low-risk tasks should proceed in goal mode within allowed scope and report briefly.
- **Use terminal scripts for read-only checks** where possible to reduce Codex / Claude token use.
- **Use the verified sudo rsync deploy template** for Tencent Cloud; GitHub push still does not update production.
- Keep diagnosis V1 disabled by default.
- Preserve legacy diagnosis response fields while V1 is being evaluated.
- When switching AI coding agents, have them read the AI handoff files before making changes.
- Frontend visual tasks must check for smart quote pollution before commit.

## Recently Completed

- Public site metadata/icons polish completed: OG PNG, root favicon, apple touch icon, manifest icon references, and 404 head metadata.
- `site.webmanifest` MIME remains a Tencent Cloud / Nginx server todo; do not change Nginx unless explicitly requested.
- `0eede24` — Mobile homepage layout density improved.
- `35e4ae1` — Subpage footer structure aligned with the home footer.
- Tencent Cloud production deployed latest mobile homepage and footer sync by sudo rsync.
- `669e3dd` — Homepage fully redesigned: hero removed, nav simplified, home-kicker strip added, footer restructured, sleeping flame removed, principle section moved to footer.
- Project marquee wheel scroll disabled; left/right buttons and auto marquee remain.
- `f78c44b` — Rate-limit test script made resilient to route indentation changes.
- `9eae74f` — Added generic `low-token-agent-mode` skill under `.agents/` and `.claude/`.
- Added FrameSpark project workflow skills:
  - `framespark-handoff-check`
  - `framespark-static-site-release-check`
  - `framespark-deploy-check`
- Added `CLAUDE.md` startup instructions for Claude Code.
- Diagnosis regression Skill remains deferred.

## Next — AI Workflow Skills

- Review the new FrameSpark workflow skills after first use and keep them short.
- Keep reports short: result, files, checks, risk, commit, next step.
- Diagnosis regression Skill remains deferred.

## Next — Diagnosis V1

- Use `diagnosis-api/DEPLOYMENT.md` as the baseline for production diagnosis-api planning.
- Prepare production env with `PORT=8788`, `HOST=127.0.0.1`, `DEEPSEEK_API_KEY`, and `ENABLE_DIAGNOSIS_V1=false`.
- Deploy `diagnosis-api` separately before reopening public diagnosis uploads.
- Configure and verify a production `/api/diagnosis` Nginx reverse proxy only after backend deployment is ready.
- Keep `/diagnosis/` in internal-test / public-upload-disabled state until the production API is confirmed.
- Resolve PDF support mismatch: either implement public PDF parsing or keep public copy limited to TXT/DOCX/paste.
- Run a focused real AI classification smoke test for:
  - `idea_concept`
  - `synopsis`
  - `prose_fiction`
- Decide route-layer strategy for inputs currently rejected before V1:
  - `non_story_material`
  - very short story-like text
  - short screenplay fragments
- Review whether V1 should generate `D0` for more rejected materials or whether route-level rejection should remain separate.
- Decide how `reportV1` should be logged in diagnosis logs and review queues.
- Add longer real-material tests before considering `ENABLE_DIAGNOSIS_V1=true` outside manual smoke tests.

## Next — Internal Evaluation / Synthetic Samples

- Extend the existing `internal/diagnosis-eval/` and `devSampleRuns` system rather than building a new testing platform.
- Design a synthetic sample library with expected material type, maturity range, and review notes.
- Store sample test runs with model, prompt version, commit hash, fallback status, material type, maturity level, and manual review status.
- Treat synthetic samples as regression aids, not as a replacement for real user materials.

## Public Site / Modularization

- Treat `js/site-data.js` as the first place to update project cards, platform cards, and ecosystem content.
- Prioritize modularity for the most frequently changing areas:
  - development project cards
  - talent platform copy and status
  - system/platform cards
- Future project cards should be ready for:
  - covers
  - icons
  - badges
  - status
  - stage
  - logline
  - order
  - visibility
  - talent needs
- Do not rewrite the site into a full frontend framework unless explicitly requested.
- Do not mix visual redesign, data-model work, and diagnosis API changes in the same commit.

## Later

- Confirm or fix `site.webmanifest` MIME in Nginx when server config work is explicitly approved.
- Consider adding `ARCHITECTURE.md` and `DECISIONS.md` once architecture work becomes heavier.
- Consider splitting the large `css/style.css` into clearer sections or files only after the current static-site deployment flow is stable.
- Consider making project detail pages more data-driven after project-card data structure stabilizes.
- Add a clear backend deployment/sync plan if the production site is Tencent Cloud rather than GitHub Pages.

## Blocked / Deferred

- Do not proceed with route-layer admission changes until the user explicitly approves a plan.
- Do not enable `ENABLE_DIAGNOSIS_V1=true` in default or production settings yet.
- Do not rely only on synthetic AI-generated samples for quality validation.
- Do not implement real talent-platform matching/recruiting features yet.
