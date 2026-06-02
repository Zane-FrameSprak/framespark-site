# Decision Log

Last updated: 2026-05-29
Updated by: ChatGPT via GitHub connector

This file records important product and engineering decisions so future AI coding agents do not re-litigate settled choices without a reason.

## 2026-05-29 — Keep `ENABLE_DIAGNOSIS_V1` disabled by default

Decision:
Keep V1 diagnosis behind `ENABLE_DIAGNOSIS_V1=true`. The default must remain false.

Reason:
The V1 pipeline and prompt have passed structural and small smoke tests, but route-level behavior, long materials, real user samples, and logging migration are not fully validated.

Impact:
Existing legacy diagnosis behavior remains safe. V1 can be tested manually without changing production defaults.

## 2026-05-29 — Preserve legacy diagnosis response fields

Decision:
Keep returning legacy fields such as `basicReport`, `finalReport`, and `report` while adding `reportV1`.

Reason:
The existing frontend, logs, review queue, and tests still depend on the old six-field report structure.

Impact:
V1 can be introduced gradually through compatibility mapping instead of a breaking frontend migration.

## 2026-05-29 — Treat route / guard / material router changes as high-risk

Decision:
Do not change route-level admission behavior without a separate plan and user approval.

Reason:
`materialRouter` and `guard` decide which user materials reach the diagnosis engine. Changing them affects public product behavior, rejection messages, minimum text length, and whether V1 can generate `D0` responses.

Impact:
Prompt-only changes are safer. Route-layer changes require explicit design.

## 2026-05-29 — Keep the public site static and lightweight

Decision:
Do not rewrite the public site into React, Vue, Next, or another frontend framework unless explicitly requested.

Reason:
The current static-site architecture already supports the current product stage and is easier for AI coding agents to modify safely.

Impact:
Public-site evolution should prioritize `site-data.js`, small render-function changes, and CSS maintenance instead of framework migration.

## 2026-05-29 — Prioritize data-driven updates for high-change public site areas

Decision:
Project cards, platform cards, ecosystem content, and future talent-platform status/copy should be maintained through data where possible.

Reason:
The user expects frequent changes to development projects and the talent platform. Data-driven updates reduce the risk of damaging page structure or styling.

Impact:
Use `js/site-data.js` first for content changes. Avoid hardcoding repeated cards directly in `index.html`.

## 2026-05-29 — Extend the existing internal evaluation system for synthetic samples

Decision:
Synthetic sample generation and regression testing should extend `internal/diagnosis-eval/`, `devSampleRuns`, and `sampleRunStore` rather than starting a new platform.

Reason:
The repository already contains a sample-run workspace, dev-only APIs, and storage for diagnosis test batches.

Impact:
Future Codex-generated sample workflows should save samples and results into the existing sample-run structure and surface them through the internal evaluation workspace.

## 2026-05-29 — Synthetic samples are regression aids, not product truth

Decision:
AI-generated synthetic samples can be used for regression testing and edge-case exploration, but not as a replacement for real user materials.

Reason:
Synthetic samples tend to be cleaner and more pattern-like than real submissions. They can overfit the system to model-generated text.

Impact:
Use synthetic samples to catch breakage and classification drift. Use real story materials for product-quality judgment.

## 2026-05-29 — Use AI handoff files as the cross-agent source of truth

Decision:
Codex, Claude Code, ChatGPT, and other coding agents should read `docs/ai-handoff/` before starting meaningful work and update the relevant handoff files after completing work.

Reason:
The user switches between multiple AI tools and model subscriptions. Repository-based handoff files are more reliable than relying on one chat history.

Impact:
Future agents should keep `PROJECT_STATE.md`, `NEXT_TASKS.md`, and `CHANGELOG_AI.md` current. Architecture or decision changes should update `ARCHITECTURE.md` and `DECISIONS.md`.

## 2026-06-02 — Do not reopen public diagnosis before backend proxy is live

Decision:
Keep the public diagnosis page in internal-test / upload-disabled state until `diagnosis-api` is separately deployed and `/api/diagnosis` is verified through Nginx.

Reason:
Production currently confirms only `/api/analytics/` reverse proxy. `/api/diagnosis` falls through to static 404 HTML behavior and is not a live JSON API.

Impact:
Do not restore public upload controls or imply live diagnosis availability before backend deployment and proxy verification.

## 2026-06-02 — Use port 8788 for production diagnosis-api

Decision:
Use `127.0.0.1:8788` for the production diagnosis API service plan.

Reason:
analytics-api already uses `127.0.0.1:8787`, so reusing the default diagnosis-api port would conflict.

Impact:
Production env examples and deployment docs should use `PORT=8788`; Nginx `/api/diagnosis/` should proxy to `http://127.0.0.1:8788/api/diagnosis/`.
