# Next Tasks

Last updated: 2026-06-03
Updated by: Codex

## Now

- **Keep low-token workflow active** — routine low-risk tasks should proceed in goal mode within allowed scope and report briefly.
- **Use terminal scripts for read-only checks** where possible to reduce Codex / Claude token use.
- **Use the verified sudo rsync deploy template** for Tencent Cloud; GitHub push still does not update production.
- Keep the public site as brand display plus internal-test preview; do not make unfinished diagnosis, talent, or project areas look open.
- Keep homepage card clicks as unavailable-state prompts until product flows are intentionally opened.
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
- Use `AGENTS.md` plus `.agents/skills/framespark-target-mode/SKILL.md` as the default project-level operating rules for future target-mode tasks.
- Diagnosis regression Skill remains deferred.

## Next — Diagnosis V1

- Use `diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md` as the current V1 architecture plan.
- Treat staged V1 as the future mainline: D0 gatekeeper, basic diagnosis, advanced diagnosis, final conversion advice.
- Current work is still planning only. Do not enable `ENABLE_DIAGNOSIS_V1=true`.
- Next recommended implementation step: add staged runner skeleton and no-AI tests.
- V1 commit 1 completed the pure gatekeeper / stage-decision skeleton.
- V1 commit 2 completed the mock staged runner skeleton and no-AI staged runner tests.
- `ENABLE_V1_STAGED_RUNNER=false` is now documented and tested as the future staged branch gate.
- Staged runner is now wired into `diagnosisPipeline` behind explicit switches, but still uses the no-AI mock runner.
- V1 stage prompt drafts now exist for basic, advanced, and final. They are not connected to runner or AI calls.
- `aiClient.generateV1StageReport` now exists and is mock-tested. It is not connected to runner or production pipeline yet.
- `v1StageRunner` now supports injected stage AI calls behind `ENABLE_V1_REAL_PROMPTS=false`.
- `npm run smoke:v1-staged-real` runs a guarded mock-only basic-stage smoke. Do not run `--real` without explicit approval.
- The guarded smoke now reads `dev-samples/v1-staged-smoke-short-synopsis.txt`, a fictional internal short synopsis sample.
- First guarded `--real` basic smoke has succeeded once with no fallback; next do not jump to public upload.
- Mock `--max-stage=advanced` and `--max-stage=final` are available for serial staged smoke. Real advanced/final remains blocked.
- Protected real advanced parameters are available, but not executed: `--real --real-stage=advanced --confirm-real-stage=advanced`.
- First real advanced smoke timed out. Protected minimal mode is now required for the next real advanced attempt.
- Minimal real advanced smoke succeeded once. Do not treat it as full advanced quality validation.
- Minimal real final smoke succeeded once. Do not treat it as full final quality validation.
- Next recommended step: plan full-input advanced smoke or staged runner evaluation hooks; do not reopen public upload or deploy `/api/diagnosis`.
- Do not start by changing route, guard, or materialRouter. Their hard-reject vs D0 boundary must be test-locked first.
- Use `diagnosis-api/DEPLOYMENT.md` as the baseline for production diagnosis-api planning.
- Use `diagnosis-api/DEPLOYMENT_RUNBOOK.md` before any production execution.
- Review the diagnosis systemd/Nginx script drafts before any server execution.
- Prepare production env with `PORT=8788`, `HOST=127.0.0.1`, `DEEPSEEK_API_KEY`, and `ENABLE_DIAGNOSIS_V1=false`.
- Deploy `diagnosis-api` separately before reopening public diagnosis uploads.
- Configure and verify a production `/api/diagnosis` Nginx reverse proxy only after backend deployment is ready.
- Keep `/diagnosis/` in internal-test / public-upload-disabled state until the production API is confirmed.
- Keep public diagnosis upload copy limited to TXT/DOCX/paste until PDF support is separately implemented.
- Treat public PDF support as a standalone task: migrate parser logic, add tests, add error copy, and keep scanned PDF / OCR out of current scope.
- Next safe paths: create/review production env, review script drafts, or plan public PDF support separately. Do not reopen public uploads yet.
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
- Keep development project detail pages `noindex` and out of sitemap until they are meant for public indexing.
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

## Launch Window — 2026-06-08

- Before June 8, keep the public site frozen except for P0/P1 fixes.
- Do final manual observation on the Tencent Cloud production site, including mobile browsers and common share/open paths.
- If a P0/P1 public-site issue appears, fix only the affected static files and deploy with the verified sudo rsync flow.
- Do not add new public-site features before launch.
- Do not reopen diagnosis upload, talent platform, project details, registration/login, `/api/diagnosis`, V1 public routing, or internal-console work before launch.
- After June 8, resume planning for V1 diagnosis evaluation, internal control console, user system, and backend deployment as separate tasks.

## Next — Internal V1 Diagnostics UI

- `internal/diagnosis-eval` now displays saved V1 summary fields: reportV1 presence, stage reached, decision, prompt version, model, fallback, latency, maturity, stage, next step, and stop reason.
- `internal/admin-console` now shows a V1 evaluation summary area from dev sample run summary fields when available.
- A minimal real V1 sample-run link check has confirmed the path from DeepSeek V4-flash output to sample-run summary fields and both internal pages.
- Use `docs/diagnosis/V1_EVAL_STANDARD.md` before judging V1 report quality.
- Next V1 evaluation step: run 3 to 5 non-private samples through basic only, manually score them with the standard, then decide whether to proceed to advanced or final full-input tests.
- Current next action: manually score `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md`; do not run a larger batch before the manual review is complete.
- The review file has neutral summaries for the three 2026-06-09 basic sample runs. Next work should be manual scoring only; do not add more sample runs or real AI calls until those scores and reviewer notes are recorded.
- Treat the worksheet as preparation material, not model self-scoring and not a final quality decision.
- Next diagnosis work should be a Plan for modifying D0 gatekeeper / material maturity handling, basic prompt specificity, `nextStep` stability, and JSON schema stability. Do not modify `diagnosis-api` or prompt source files before that Plan is approved.
- Regression target after any future code/prompt change: Sample 03 should return D0 or a clear supplement-material result; Sample 01 should avoid unsupported "atonement" interpretation; Sample 02 should produce more specific suggestions.
- Patch 1 is complete: D0/basic boundary and `nextStep` stability now have no-AI regression coverage. Next code-facing step should be Patch 2 only after approval: basic prompt fidelity and suggestion specificity.
- Patch 2 real-AI regression is complete and documented. Next work should be manual review of `docs/diagnosis/V1_PATCH2_REAL_REGRESSION_2026-06-09.md` plus the existing V1 basic review worksheet.
- Do not run a larger real-AI batch until the manual review notes decide whether Patch 2 is sufficient or needs another prompt pass.
- V1 advanced small test review is now prepared as a Chinese-first worksheet in `docs/diagnosis/V1_ADVANCED_SAMPLE_REVIEW_2026-06-09.md`. Next work should be manual scoring and reviewer notes for Sample 01 and Sample 02 advanced outputs, plus confirmation that Sample 03 should remain D0.
- Do not run final-stage tests, full-input advanced batches, or larger real-AI batches until the advanced review notes are filled.
- Do not treat the AI stage decisions in the advanced worksheet as product approval or public-readiness approval.
- V1 final small test review is prepared in `docs/diagnosis/V1_FINAL_SAMPLE_REVIEW_2026-06-10.md`. Next work should be human review of maturity restraint, conversion-language safety, Sample 01 over-interpretation signals, and final-stage decision formatting.
- Do not rerun final, modify the final prompt, or expand the batch until the reviewer records whether the observed issues require a prompt or schema follow-up.
- Do not treat `possible_after_revision`, `continue_final`, or “整理项目档案” as approval to open public diagnosis or deploy `/api/diagnosis`.
- Review `docs/diagnosis/V1_FINAL_PATCH3_REGRESSION_2026-06-10.md`. Patch 3 improved stage closure and nextStep priority, but `patch3b` still needs a separately authorized two-call real regression because the previous task reached its 4-call limit.
- The next real regression, if approved, should only verify that Sample 01 / 02 no longer contain unsupported high-interpretation terms or invented replacement facts. Do not change basic, advanced, gatekeeper, public entry, or deployment state.
- Keep this first UI pass summary-only; do not build a full reportV1 detail page yet.
- Do not run real AI from the internal eval page without explicit user confirmation.
- Keep `internal/` local-only and excluded from Tencent Cloud webroot.
