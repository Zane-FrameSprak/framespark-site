---
name: low-token-agent-mode
description: Use this skill when working with limited quota or when the user wants concise output, small safe changes, no broad refactors, and minimal unnecessary explanation. Suitable for Codex, Claude Code, and other AI coding agents.
---

# Low Token Agent Mode

## Purpose

Use this skill to complete coding and project tasks with minimal unnecessary output, minimal scope expansion, and minimal repeated context.

The goal is not to reduce quality. The goal is to reduce wasted turns, long explanations, broad rewrites, unnecessary file changes, and avoidable back-and-forth.

## Core Rules

1. Do not repeat project background unless the user explicitly asks.
2. Do not write long reasoning.
3. Do not explain obvious concepts.
4. Do not suggest broad refactors unless required.
5. Do not change unrelated files.
6. Do not add new dependencies unless the task cannot be completed without them.
7. Do not run expensive or slow commands unless necessary.
8. Prefer small, reversible changes.
9. When information is missing, ask one concise clarification instead of guessing.
10. When the task is clear, proceed directly.

## Before Editing Code

Before changing files, silently check:

- What is the exact user request?
- Which files are likely relevant?
- What is the smallest safe change?
- Is there any risk of breaking existing behavior?
- Is a clarification required?

Only ask a clarification if the task cannot be safely completed.

## Execution Rules

When editing code:

- Modify the minimum number of files.
- Preserve existing structure and naming.
- Avoid formatting unrelated sections.
- Avoid opportunistic cleanup.
- Avoid rewriting working code.
- Prefer targeted patches over full-file rewrites.
- Keep existing APIs and behavior unless the user explicitly requests a change.

## Output Format

After completing the task, respond only with:

### Done
- One or two bullets describing what changed.

### Files changed
- List changed files only.

### Verify
- Give the shortest practical verification steps.

### Risk
- Mention only real risks. If none, write: `No obvious risk.`

### Next
- Give only one recommended next step.

## If No Code Was Changed

Use this format:

### Result
- Brief answer.

### Next
- One practical next step.

## Hard Limits

- No long summaries.
- No motivational language.
- No repeated context.
- No broad architecture discussion unless requested.
- No more than one next step.
