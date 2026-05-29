# AI Changelog

## Recent Summary

- 2026-05-29: Added AI handoff files under `docs/ai-handoff/`.
- 2026-05-29: Diagnosis V1 schema, gated pipeline, and prompt boundary refinements are present on GitHub.
- 2026-05-29: `ENABLE_DIAGNOSIS_V1` remains false by default.

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
- Diagnosis V1 work is already on GitHub:
  - `4e47d9b` — report V1 schema compatibility layer.
  - `1df8f0e` — gated V1 diagnosis pipeline.
  - `4020abaa` — V1 material classification prompt boundaries.

### Notes

- Handoff files were added directly through the GitHub connector.
- Each `create_file` call created a separate commit through GitHub's contents API.
- If a single combined docs commit is preferred later, squash or reorganize from a local checkout.
- Local uncommitted files on the user's machine may still differ from GitHub, especially home hero animation changes.
