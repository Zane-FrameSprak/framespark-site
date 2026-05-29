# AI Changelog

## Recent Summary

- 2026-05-29: Committed homepage hero compact animation (`94160f1`) — not yet pushed.
- 2026-05-29: Added AI handoff files under `docs/ai-handoff/`.
- 2026-05-29: Diagnosis V1 schema, gated pipeline, and prompt boundary refinements are present on GitHub.
- 2026-05-29: `ENABLE_DIAGNOSIS_V1` remains false by default.
- 2026-05-29: Completed a broad repository read of core text files and updated handoff files with architecture/state findings.

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
