# Working Rules for AI Coding Agents

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector

These rules apply to Codex, Claude Code, ChatGPT, and any other AI coding agent working in this repository.

## Default Development Style

- This project is developed iteratively.
- Prefer small, compatible, reversible changes.
- Do not make large rewrites unless explicitly asked.
- Do not introduce new frameworks, build systems, or large dependencies without approval.
- Keep one commit focused on one clear goal.
- Do not mix unrelated changes in the same commit.

## Before Starting Work

Read these files first when available:

```text
docs/ai-handoff/PROJECT_CONTEXT.md
docs/ai-handoff/WORKING_RULES.md
docs/ai-handoff/PROJECT_STATE.md
docs/ai-handoff/NEXT_TASKS.md
```

For high-risk tasks, also review recent entries in:

```text
docs/ai-handoff/CHANGELOG_AI.md
```

Then summarize the current state briefly before modifying code.

## Commit Rules

- Run `git status` before editing.
- Identify unrelated uncommitted files before staging.
- Stage only files that belong to the current task.
- Do not commit unrelated files.
- Do not push unless the user explicitly asks.
- After finishing, report commit hash, tests, and remaining uncommitted files.

## Risk Levels

### Low-risk tasks

Examples:

- Commit already-reviewed changes.
- Update small copy or docs.
- Add static tests.
- Run checks.
- Change data in `js/site-data.js` without changing rendering behavior.

Low-risk tasks may be executed directly if the user asked for implementation.

### Medium-risk tasks

Examples:

- Add a small test script.
- Adjust a prompt slightly.
- Add compatible response fields.
- Update a non-public internal tool page.

Use small commits and run relevant tests.

### High-risk tasks

Plan first. Do not modify code until the plan is approved.

High-risk areas:

- `diagnosis-api/src/routes/diagnosis.js`
- `diagnosis-api/src/services/guard.js`
- `diagnosis-api/src/services/materialRouter.js`
- `diagnosis-api/src/services/diagnosisPipeline.js`
- database / storage behavior
- deployment and server configuration
- authentication / permissions
- public diagnosis availability
- route-layer admission strategy
- removing legacy fields
- enabling production-facing feature flags

## Diagnosis System Rules

- Keep `ENABLE_DIAGNOSIS_V1` false by default unless explicitly told otherwise.
- Keep old response fields such as `finalReport`, `basicReport`, and `report` until the frontend, logs, and review tools are migrated.
- Do not delete legacy `basic` / `advanced` prompt files without explicit approval.
- V1 diagnosis work should remain compatible with the legacy route and frontend.
- If V1 fails, fallback behavior must not break existing diagnosis responses.

## Public Site Rules

- Keep the static site lightweight.
- Do not rewrite the site into React, Vue, Next, or another framework unless explicitly approved.
- Prefer data-driven updates through `js/site-data.js` for project cards, platform cards, ecosystem entries, and similar content.
- Do not hardcode project cards in `index.html` if they belong in data.
- Do not modify visual styling while doing data-only or schema-only work.

## Handoff File Rules

At the end of meaningful tasks, update:

```text
docs/ai-handoff/PROJECT_STATE.md
docs/ai-handoff/NEXT_TASKS.md
docs/ai-handoff/CHANGELOG_AI.md
```

Only update `PROJECT_CONTEXT.md` when product direction changes.

Keep handoff files short, factual, and structured. Do not turn them into long essays.
