---
name: framespark-handoff-check
description: Use when taking over FrameSpark work from another AI agent or before planning a new task; performs a short read-only handoff check from docs/ai-handoff and git state.
---

# FrameSpark Handoff Check

## Use When

- Starting meaningful FrameSpark work.
- Auditing project state before a task.
- Switching between Codex, Claude Code, GPT, or other agents.

## Read First

- `docs/ai-handoff/PROJECT_CONTEXT.md`
- `docs/ai-handoff/WORKING_RULES.md`
- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`
- `docs/ai-handoff/CHANGELOG_AI.md`
- `docs/ai-handoff/ARCHITECTURE.md`
- `docs/ai-handoff/DECISIONS.md`

## Run

```bash
git status --short
git branch --show-current
git log --oneline -8
git rev-list --left-right --count @{u}...HEAD 2>/dev/null || true
```

## Do Not

- Do not change code, commit, push, deploy, or run AI/API tests unless asked.
- Do not expand into architecture work unless the user asks.
- Do not enable `ENABLE_DIAGNOSIS_V1`.

## Output

- Current state: 3-5 bullets.
- Risks: only real blockers.
- Next: one recommended action.
- Keep it short.

## Update Handoff

Update handoff only after meaningful completed work, usually:

- `PROJECT_STATE.md`
- `NEXT_TASKS.md`
- `CHANGELOG_AI.md`
