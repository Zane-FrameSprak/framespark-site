# Claude Code Startup

## Start Here

For normal tasks, read:

- `docs/ai-handoff/PROJECT_CONTEXT.md`
- `docs/ai-handoff/WORKING_RULES.md`
- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`

For high-risk tasks, also read:

- `docs/ai-handoff/ARCHITECTURE.md`
- `docs/ai-handoff/DECISIONS.md`
- `docs/ai-handoff/CHANGELOG_AI.md`

## Default Mode

- Use `low-token-agent-mode` by default.
- Keep reports short.
- Make small, focused changes.
- Do not mix unrelated files.
- Plan first for high-risk work.
- For routine low-risk tasks, use goal mode and continue automatically within allowed scope; stop only on explicit stop conditions.

## Available Skills

- `low-token-agent-mode`
- `framespark-handoff-check`
- `framespark-static-site-release-check`
- `framespark-deploy-check`

## High-Risk Areas

Plan and get confirmation before changing:

- `diagnosis-api/src/routes/diagnosis.js`
- `diagnosis-api/src/services/guard.js`
- `diagnosis-api/src/services/materialRouter.js`
- `diagnosis-api/src/services/diagnosisPipeline.js`
- deployment scripts
- Nginx, SSL, API reverse proxy
- default value of `ENABLE_DIAGNOSIS_V1`

## Frontend Visual Work

- Check for Chinese curly quote pollution.
- Confirm the browser loads current CSS and JS.
- Run `node --check` for touched JS.
- Do not mix visual changes with diagnosis or deployment changes.

## Git Rules

- Run `git status` first.
- Keep one task per commit.
- Do not push unless asked.
- Do not deploy unless asked.
