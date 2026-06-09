---
name: framespark-target-mode
description: Use for FrameSpark target-mode tasks where the user wants fewer handoffs, automatic execution inside a declared safe scope, and strict stop conditions at risk boundaries.
---

# FrameSpark Target Mode

## Purpose

Reduce repeated instructions across FrameSpark tasks. Work from the user target, allowed files, forbidden files, and acceptance checks. Complete safe work end to end.

## Rules

- Use `AGENTS.md` as the project-level operating source.
- Keep output short.
- Do not repeat project history.
- Run `git status -sb` first.
- Stay inside the user's allowed scope.
- For low-risk docs, handoff, static-site, or internal-eval work: inspect, edit, check, commit, and push when the user allows push.
- For static-site deploy requests: push first if required, then use the verified rsync dry-run flow before deploy.
- For docs / internal / eval work: commit and push when allowed; do not deploy.

## Stop Conditions

Stop and report before doing anything if the task needs:

- diagnosis-api high-risk changes.
- prompt source, D0 gatekeeper, stage decision, or pipeline edits without an approved Plan.
- real AI calls without explicit approval.
- more than the approved real AI call budget.
- Nginx, SSL, systemd, database, credential/key, or server config changes.
- public upload, production `/api/diagnosis`, user login, or talent-platform opening.
- final diagnosis quality judgment that belongs to the review assistant.

## Output

Report only:

- changed files
- checks
- commit hash
- push/deploy status
- one next step

Keep normal final reports within the user's line limit.
