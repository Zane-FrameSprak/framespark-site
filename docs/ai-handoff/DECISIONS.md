# Decision Log

Last updated: 2026-06-03
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

## 2026-06-09 — Evaluate V1 reports with an internal scoring standard before promotion

Decision:
Use `docs/diagnosis/V1_EVAL_STANDARD.md` as the required internal scoring standard for V1 report quality before promoting any stage or considering user-facing trials.

Reason:
Successful smoke tests prove that the pipeline can return and store summaries, but they do not prove report quality, material faithfulness, or user-readiness.

Impact:
Future V1 sample runs should be manually scored across the documented dimensions. Basic-stage batches should pass the standard before advanced or final full-input tests are treated as meaningful.

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

## 2026-06-02 — Public diagnosis upload formats are TXT/DOCX/paste for now

Decision:
Short-term public diagnosis copy must only promise TXT, DOCX, and pasted text. Do not publicly promise PDF support yet.

Reason:
The public parser supports TXT/DOCX/paste. Internal dev tooling may parse text PDF samples, but that is not public support.

Impact:
PDF support is a separate future task requiring parser migration, tests, and error copy. Scanned PDF / OCR is out of current scope.

## 2026-06-02 — Keep unfinished public product areas closed

Decision:
Treat the public site as a brand display and internal-test preview site for now. Diagnosis, talent, and development project areas must not read as open product flows.

Reason:
The diagnosis backend is not yet proxied in production, the talent platform is not open, and development project files are not public collaboration or recruitment pages.

Impact:
Diagnosis stays upload-disabled, talent copy stays not-open, and development project detail pages stay accessible but `noindex` and out of sitemap until public indexing is intentional.

## 2026-06-03 — Make V1 diagnosis staged before it becomes the mainline

Decision:
Future diagnosis work should move toward a staged V1 architecture: D0 gatekeeper, basic diagnosis, advanced diagnosis, and final conversion advice. Stages should not all run by default.

Reason:
The current V1 path is a gated single AI call with compatibility mapping. It is useful for testing but does not match the product goal of stopping at the right maturity level.

Impact:
Keep `ENABLE_DIAGNOSIS_V1=false`. Keep legacy fallback. Add staged runner skeletons and no-AI tests before changing route, guard, or materialRouter behavior.

## 2026-06-04 — Launch the black-gold public site first

Decision:
Use the current black-gold public website as the June 8 launch version. Do not add a light theme before launch.

Reason:
The current visual system has been checked on production and is sufficient for launch readiness. Theme expansion would add visual QA risk before launch.

Impact:
Only P0/P1 static-site fixes should be made before launch.

## 2026-06-04 — Keep unfinished product systems closed for launch

Decision:
Do not open public diagnosis upload, user registration/login, talent-platform functions, project-library functions, or `/api/diagnosis` production access before the June 8 launch.

Reason:
The public site is currently a brand display plus internal-test preview site. Diagnosis V1 smoke tests are encouraging, but they do not mean the public product flow is ready.

Impact:
The diagnosis page stays as an internal-test notice. `/api/diagnosis` remains undeployed/unproxied. User-system and talent-platform work resume only after launch as separate tasks.

## 2026-06-09 — Do not open V1 MVP before D0/basic boundary fixes

Decision:
Do not expose V1 diagnosis as an MVP until the D0 / basic boundary, `nextStep` stability, basic prompt specificity, and over-interpretation controls are planned and addressed.

Reason:
The 3-sample V1 basic review found no P0, but Sample 03 is a P1 boundary issue: low-maturity material returned `stage=basic` and must not move to advanced. Sample 01 also shows mild over-interpretation risk, and Sample 02 shows generic suggestion risk.

Impact:
Next work should be a Plan for diagnosis-api / prompt changes only. Do not modify prompt source, D0 gatekeeper, pipeline, public upload, or `/api/diagnosis` before that Plan is approved.

## 2026-06-09 — Use AGENTS.md as the project-level agent rule entry

Decision:
Use root `AGENTS.md` as the primary project-level operating rules for Codex and other coding agents. Use `.agents/skills/framespark-target-mode/SKILL.md` for concise target-mode tasks.

Reason:
FrameSpark tasks repeatedly require the same boundaries: risk classification, stop conditions, AI-call limits, commit/push/deploy policy, public-site boundaries, V1 diagnosis boundaries, internal-tool boundaries, and privacy rules. Keeping them in the repository reduces repeated long prompts and cross-agent drift.

Impact:
Future tasks can specify only the concrete target, allowed files, forbidden files, and checks. Agents should follow `AGENTS.md` first, then the relevant handoff files and task-specific instructions.

## 2026-06-10 — Use a separate invitation-only diagnosis Beta

Decision:
Keep the public `/diagnosis/` page as a preview. Any first MVP trial must use an unlinked `/diagnosis/beta/` path protected by Nginx Basic Auth and API-side trusted identity/origin checks.

Reason:
The diagnosis engine has passed staged quality observation, but production access control, privacy review, quotas, logging, deployment, and rollback still require controlled verification.

Impact:
Do not restore public upload controls or expose `/api/diagnosis/` without the protected deployment gate and a separate release decision.

## 2026-06-10 — Fail closed and minimize diagnosis data

Decision:
Production diagnosis must reject unsafe V1 output or runner failure rather than present a legacy fallback as a successful user report. Store only redacted metadata by default; full material/report retention requires explicit review consent and expires after 14 days.

Reason:
Fallback success can hide safety failures, while unnecessary storage of creative materials creates avoidable privacy and copyright risk.

Impact:
The public DTO excludes internal diagnostics and raw reports. Production readiness requires the real staged runner, all safety switches, external data storage, access isolation, and strict quotas before the service is considered ready.

## 2026-06-15 — Build access codes before replacing Basic Auth

Decision:
Add the access-code data/session foundation behind a default-off feature flag before changing the homepage or Nginx. The first real cohort will use five newly generated codes, one per person; existing Basic Auth credentials are not migrated.

Reason:
This isolates storage, transaction, revocation, rate-limit and session security work from the public entry and proxy cutover. Basic Auth remains a reversible production boundary while the new foundation is tested without AI or server changes.

Impact:
Phase 1 may be committed and pushed but not deployed or enabled. Homepage UI, Nginx `auth_request`, production secrets, real code generation and Basic Auth retirement require separate authorization.

## 2026-06-15 — Keep the access-code client transient and fixed-path

Decision:
The homepage validates only whether the trimmed code is empty, sends it only in a same-origin JSON body, and accepts only the fixed `/diagnosis/beta/` success destination. It does not persist, log, analyze or parse the code format.

Reason:
Code validity belongs to the Phase 1 server foundation. Keeping client behavior minimal avoids leaking credential structure and prevents server-controlled open redirects.

Impact:
Phase 2 can be tested and committed without enabling production access. Nginx cookie validation and Basic Auth migration remain a separately reviewed Phase 3 boundary.
