# Next Tasks

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector

## Now

- Keep diagnosis V1 disabled by default.
- Use existing V1 commits as the base for future testing.
- Preserve legacy diagnosis response fields while V1 is being evaluated.
- When switching AI coding agents, have them read the AI handoff files before making changes.
- Keep local uncommitted home hero animation files isolated from diagnosis-system commits.

## Next — Diagnosis V1

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

- Consider adding `ARCHITECTURE.md` and `DECISIONS.md` once architecture work becomes heavier.
- Consider splitting the large `css/style.css` into clearer sections or files only after the current static-site deployment flow is stable.
- Consider making project detail pages more data-driven after project-card data structure stabilizes.
- Add a clear backend deployment/sync plan if the production site is Tencent Cloud rather than GitHub Pages.

## Blocked / Deferred

- Do not proceed with route-layer admission changes until the user explicitly approves a plan.
- Do not enable `ENABLE_DIAGNOSIS_V1=true` in default or production settings yet.
- Do not rely only on synthetic AI-generated samples for quality validation.
- Do not implement real talent-platform matching/recruiting features yet.
