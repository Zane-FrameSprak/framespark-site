# Project State

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector
Current branch: main
Repository: `Zane-FrameSprak/framespark-site`

## Current Repository Snapshot

The GitHub repository exists at `Zane-FrameSprak/framespark-site` and uses `main` as the default branch.

The public site is a static site. The home page skeleton is in `index.html`, while home page data is already centralized in `js/site-data.js`. The home page rendering and project marquee logic are in `js/main.js`.

Important current home page data areas:

- `FrameSparkData.projects`
- `FrameSparkData.platforms`
- `FrameSparkData.ecosystem`

## Recent Diagnosis V1 Work

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

## Known Route-Level Issue

V1 pipeline smoke tests passed, but route-level behavior still needs product review.

Observed route-level issues:

- Some `non_story_material` inputs are rejected before they reach V1, so V1 does not generate `D0` in those cases.
- Very short story-like text can be rejected by `materialRouter` or `guard` before V1.
- Short screenplay fragments may be blocked by existing full-script length thresholds.
- `synopsis` and `prose_fiction` classification boundaries were refined in prompt rules, but need another real AI smoke test.

Do not change route admission behavior without a plan and user approval.

## Public Site State

The public home page already uses a data-driven structure for:

- Project cards.
- System/platform cards.
- Ecosystem items.

`index.html` contains section skeletons and mount points such as `platformList`, `projectReel`, and `ecosystemGrid`.

`js/site-data.js` currently holds project, platform, and ecosystem data.

`js/main.js` renders cards and handles interactions such as the project marquee.

Future site work should prioritize modularity in high-change areas:

- Development project cards.
- Talent platform content.
- System/platform cards.

## Important Local-State Note

In the user's local working tree, there may still be uncommitted home hero animation changes in:

- `index.html`
- `css/style.css`
- `js/main.js`

When working locally, run `git status` first. Do not assume GitHub reflects local uncommitted changes.

## Current Safe Defaults

- Do not enable `ENABLE_DIAGNOSIS_V1` by default.
- Do not remove legacy diagnosis fields.
- Do not modify route / guard / materialRouter admission behavior without planning.
- Do not mix public site visual changes with diagnosis API changes.
- Do not push unless explicitly asked.
