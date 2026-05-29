# Next Tasks

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector

## Now

- Keep diagnosis V1 disabled by default.
- Use existing V1 commits as the base for future testing.
- Preserve legacy diagnosis response fields while V1 is being evaluated.
- When switching AI coding agents, have them read the AI handoff files before making changes.

## Next

- Run a focused real AI classification smoke test for:
  - `idea_concept`
  - `synopsis`
  - `prose_fiction`
- Decide route-layer strategy for inputs currently rejected before V1:
  - `non_story_material`
  - very short story-like text
  - short screenplay fragments
- Review whether V1 should generate `D0` for more rejected materials or whether route-level rejection should remain separate.
- Continue planning a lightweight synthetic sample regression system for the diagnosis engine.

## Public Site / Modularization

- Treat `js/site-data.js` as the first place to update project cards, platform cards, and ecosystem content.
- Prioritize modularity for the most frequently changing areas:
  - development project cards
  - talent platform copy and status
  - system/platform cards
- Future project cards should be ready for covers, icons, badges, status, stage, logline, order, and visibility.
- Do not rewrite the site into a full frontend framework unless explicitly requested.

## Later

- Add an internal-control-console entry for diagnosis regression samples.
- Create a synthetic sample library with expected material type and maturity ranges.
- Store sample test runs with model, prompt version, commit hash, fallback status, and review status.
- Consider adding `ARCHITECTURE.md` and `DECISIONS.md` once architecture work becomes heavier.

## Blocked / Deferred

- Do not proceed with route-layer admission changes until the user explicitly approves a plan.
- Do not enable `ENABLE_DIAGNOSIS_V1=true` in default or production settings yet.
- Do not rely only on synthetic AI-generated samples for quality validation.
