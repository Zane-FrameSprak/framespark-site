# Project Context

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector

## Project

FrameSpark / 帧火花 is a film and story-development project centered on:

- Public brand website.
- Story development diagnosis system.
- Internal control / diagnosis evaluation workspace.
- Project showcase pages.
- Future talent / creator collaboration platform.

## Product Direction

FrameSpark should present itself as a restrained, credible, film-oriented platform. The public site should explain what the project does without overpromising unfinished product features.

The story diagnosis system is not a paid tier system. It is a free / internal-testing product flow that should help users understand what kind of story material they uploaded, what development state it is in, and what the next useful development step should be.

The long-term path is:

```text
story material
→ diagnosis / development suggestions
→ project refinement
→ possible FrameSpark project review
→ possible talent-platform collaboration
```

## Major Product Modules

### Public Site

The public site is a static website. The current home page uses a stable page skeleton plus data-driven content rendering.

Important files:

- `index.html`: home page skeleton.
- `css/style.css`: global visual styling.
- `js/site-data.js`: home page content data.
- `js/main.js`: home page rendering and interaction logic.
- `projects/`: project detail pages.
- `diagnosis/`: public diagnosis entry page.
- `talent/`: talent platform entry page.

### Story Diagnosis System

The diagnosis API lives under `diagnosis-api/`.

Current direction:

- Keep the old legacy diagnosis path working.
- Add `reportV1` gradually.
- Keep `ENABLE_DIAGNOSIS_V1` disabled by default until real route-level tests and longer samples are stable.
- Keep backward-compatible fields such as `finalReport`, `basicReport`, and `report`.

### Internal Control / Evaluation Workspace

Internal tools are used to inspect diagnosis logs, review queues, development sample runs, and future regression/evaluation samples. This workspace is important for future AI-assisted testing and product iteration.

### Talent Platform

The talent platform is currently a future-facing product area. It may later support creator profiles, project matching, project needs, collaboration status, and internal review.

## Current Product Principles

- Build iteratively.
- Keep changes small and reversible.
- Prefer compatibility layers over hard replacement.
- Avoid locking the product into one model vendor or one prompt format.
- Public copy should be restrained and accurate.
- Internal systems can be more experimental, but must be clearly separated from public behavior.

## What Not To Do Yet

- Do not rewrite the public site into React / Vue / Next unless explicitly requested.
- Do not remove legacy diagnosis fields until the frontend and logs are fully migrated.
- Do not enable `ENABLE_DIAGNOSIS_V1` by default without explicit approval.
- Do not treat synthetic AI-generated samples as a replacement for real user testing.
