# Next Tasks

Last updated: 2026-06-12
Updated by: Codex

## Now

- Diagnosis Beta Stage A is complete and stopped at the secret boundary. Use `docs/diagnosis/DIAGNOSIS_BETA_DEPLOY_STAGE_A_2026-06-11.md` as the execution evidence.
- The user must independently SSH and use `sudoedit /etc/framespark/diagnosis-api.env` or an equivalent non-echoing method to add `DEEPSEEK_API_KEY`; never send or print the key in chat, command arguments, Git, or logs.
- After the key is safely present, require a new explicit authorization before `systemctl daemon-reload`, service enable/start, readiness checks, Basic Auth creation, Nginx changes, real AI smoke, or Beta/API opening.
- Keep the current service inactive/disabled, port `8788` without a listener, public `/diagnosis/` frozen, and active Nginx unchanged until that authorization.
- The moderate production dependency finding is fixed in the repository lockfile: `qs` now resolves transitively to `6.15.2`, production audit is clean, and V1/MVP no-AI regression passed. See `docs/diagnosis/DIAGNOSIS_BETA_NPM_AUDIT_REVIEW_2026-06-12.md`.
- Stage A2 installed the patched immutable release at `683dea7fa98848cc40829b825cf4209692b7abe4`; `current` selects it and `previous` retains `f4451587...`. Do not mutate either release in place.
- The next permitted action is only the user's separate, non-echoing server-side entry of `DEEPSEEK_API_KEY`. Afterward, require another explicit authorization before daemon reload, service activation, readiness checks, Basic Auth, Nginx, real AI, or Beta/API opening.

- Use `docs/diagnosis/DIAGNOSIS_BETA_HUMAN_CONFIRMATION_2026-06-11.md` as the decision baseline for the next controlled deployment execution plan. The plan must include a 60-minute observation period, red/yellow/green reporting, immediate red-light stop/rollback points and a separately authorized one-call fictional smoke.
- Do not distribute Beta credentials until all applicable post-deployment checks remain green for the observation window and rollback verification passes.
- Complete `docs/diagnosis/DIAGNOSIS_BETA_PRE_DEPLOY_CHECKLIST_2026-06-11.md` with named human owners and evidence before requesting any deployment task. Blank required items mean No-Go.
- Treat deployment, the single authorized production AI smoke and invitation distribution as separate approvals; do not infer one approval from another.
- Use `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_FIX_REVIEW_2026-06-11.md` to prepare the human confirmation and pre-deployment checklist. Re-lock full SHAs after a fresh fetch and attach target-host evidence before considering any execution task.
- Keep the Diagnosis Beta deployment and rollback shell files as non-executable drafts with their unconditional safety exits. Do not connect to the server, apply Nginx/systemd, write credentials, run real AI, or open Beta/API routes in the checklist phase.
- Review the local MVP productionization changes as separate commits; do not enable the Beta route or deploy the API during commit preparation.
- **Keep low-token workflow active** — routine low-risk tasks should proceed in goal mode within allowed scope and report briefly.
- **Use terminal scripts for read-only checks** where possible to reduce Codex / Claude token use.
- **Use the verified sudo rsync deploy template** for Tencent Cloud; GitHub push still does not update production.
- Keep the public site as brand display plus internal-test preview; do not make unfinished diagnosis, talent, or project areas look open.
- Keep homepage card clicks as unavailable-state prompts until product flows are intentionally opened.
- Keep diagnosis V1 disabled by default.
- Preserve legacy diagnosis response fields while V1 is being evaluated.
- When switching AI coding agents, have them read the AI handoff files before making changes.
- Frontend visual tasks must check for smart quote pollution before commit.

## Recently Completed

- Public site metadata/icons polish completed: OG PNG, root favicon, apple touch icon, manifest icon references, and 404 head metadata.
- `site.webmanifest` MIME remains a Tencent Cloud / Nginx server todo; do not change Nginx unless explicitly requested.
- `0eede24` — Mobile homepage layout density improved.
- `35e4ae1` — Subpage footer structure aligned with the home footer.
- Tencent Cloud production deployed latest mobile homepage and footer sync by sudo rsync.
- `669e3dd` — Homepage fully redesigned: hero removed, nav simplified, home-kicker strip added, footer restructured, sleeping flame removed, principle section moved to footer.
- Project marquee wheel scroll disabled; left/right buttons and auto marquee remain.
- `f78c44b` — Rate-limit test script made resilient to route indentation changes.
- `9eae74f` — Added generic `low-token-agent-mode` skill under `.agents/` and `.claude/`.
- Added FrameSpark project workflow skills:
  - `framespark-handoff-check`
  - `framespark-static-site-release-check`
  - `framespark-deploy-check`
- Added `CLAUDE.md` startup instructions for Claude Code.
- Diagnosis regression Skill remains deferred.

## Next — AI Workflow Skills

- Review the new FrameSpark workflow skills after first use and keep them short.
- Keep reports short: result, files, checks, risk, commit, next step.
- Use `AGENTS.md` plus `.agents/skills/framespark-target-mode/SKILL.md` as the default project-level operating rules for future target-mode tasks.
- Diagnosis regression Skill remains deferred.

## Next — Diagnosis V1

- Patch 5b and Patch 5c are complete. Review `docs/diagnosis/V1_FINAL_PATCH5C_REAL_REGRESSION_2026-06-10.md` before further final work.
- Do not run another real batch automatically. First decide whether to improve provider compliance telemetry or prompt/schema ergonomics after the two initial controlled failures.
- Do not enable V1 by default, deploy `/api/diagnosis`, or reopen public upload based on these patches.

- Use `diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md` as the current V1 architecture plan.
- Treat staged V1 as the future mainline: D0 gatekeeper, basic diagnosis, advanced diagnosis, final conversion advice.
- Current work is still planning only. Do not enable `ENABLE_DIAGNOSIS_V1=true`.
- Next recommended implementation step: add staged runner skeleton and no-AI tests.
- V1 commit 1 completed the pure gatekeeper / stage-decision skeleton.
- V1 commit 2 completed the mock staged runner skeleton and no-AI staged runner tests.
- `ENABLE_V1_STAGED_RUNNER=false` is now documented and tested as the future staged branch gate.
- Staged runner is now wired into `diagnosisPipeline` behind explicit switches, but still uses the no-AI mock runner.
- V1 stage prompt drafts now exist for basic, advanced, and final. They are not connected to runner or AI calls.
- `aiClient.generateV1StageReport` now exists and is mock-tested. It is not connected to runner or production pipeline yet.
- `v1StageRunner` now supports injected stage AI calls behind `ENABLE_V1_REAL_PROMPTS=false`.
- `npm run smoke:v1-staged-real` runs a guarded mock-only basic-stage smoke. Do not run `--real` without explicit approval.
- The guarded smoke now reads `dev-samples/v1-staged-smoke-short-synopsis.txt`, a fictional internal short synopsis sample.
- First guarded `--real` basic smoke has succeeded once with no fallback; next do not jump to public upload.
- Mock `--max-stage=advanced` and `--max-stage=final` are available for serial staged smoke. Real advanced/final remains blocked.
- Protected real advanced parameters are available, but not executed: `--real --real-stage=advanced --confirm-real-stage=advanced`.
- First real advanced smoke timed out. Protected minimal mode is now required for the next real advanced attempt.
- Minimal real advanced smoke succeeded once. Do not treat it as full advanced quality validation.
- Minimal real final smoke succeeded once. Do not treat it as full final quality validation.
- Next recommended step: plan full-input advanced smoke or staged runner evaluation hooks; do not reopen public upload or deploy `/api/diagnosis`.
- Do not start by changing route, guard, or materialRouter. Their hard-reject vs D0 boundary must be test-locked first.
- Use `diagnosis-api/DEPLOYMENT.md` as the baseline for production diagnosis-api planning.
- Use `diagnosis-api/DEPLOYMENT_RUNBOOK.md` before any production execution.
- Review the diagnosis systemd/Nginx script drafts before any server execution.
- Prepare production env with `PORT=8788`, `HOST=127.0.0.1`, `DEEPSEEK_API_KEY`, and `ENABLE_DIAGNOSIS_V1=false`.
- Deploy `diagnosis-api` separately before reopening public diagnosis uploads.
- Configure and verify a production `/api/diagnosis` Nginx reverse proxy only after backend deployment is ready.
- Keep `/diagnosis/` in internal-test / public-upload-disabled state until the production API is confirmed.
- Keep public diagnosis upload copy limited to TXT/DOCX/paste until PDF support is separately implemented.
- Treat public PDF support as a standalone task: migrate parser logic, add tests, add error copy, and keep scanned PDF / OCR out of current scope.
- Next safe paths: create/review production env, review script drafts, or plan public PDF support separately. Do not reopen public uploads yet.
- Run a focused real AI classification smoke test for:
  - `idea_concept`
  - `synopsis`
  - `prose_fiction`
- Decide route-layer strategy for inputs currently rejected before V1:
  - `non_story_material`
  - very short story-like text
  - short screenplay fragments
- Review whether V1 should generate `D0` for more rejected materials or whether route-level rejection should remain separate.
- Decide how `reportV1` should be logged in diagnosis logs and review queues.
- Add longer real-material tests before considering `ENABLE_DIAGNOSIS_V1=true` outside manual smoke tests.

## Next — Internal Evaluation / Synthetic Samples

- Extend the existing `internal/diagnosis-eval/` and `devSampleRuns` system rather than building a new testing platform.
- Design a synthetic sample library with expected material type, maturity range, and review notes.
- Store sample test runs with model, prompt version, commit hash, fallback status, material type, maturity level, and manual review status.
- Treat synthetic samples as regression aids, not as a replacement for real user materials.

## Public Site / Modularization

- Treat `js/site-data.js` as the first place to update project cards, platform cards, and ecosystem content.
- Keep development project detail pages `noindex` and out of sitemap until they are meant for public indexing.
- Prioritize modularity for the most frequently changing areas:
  - development project cards
  - talent platform copy and status
  - system/platform cards
- Future project cards should be ready for:
  - covers
  - icons
  - badges
  - status
  - stage
  - logline
  - order
  - visibility
  - talent needs
- Do not rewrite the site into a full frontend framework unless explicitly requested.
- Do not mix visual redesign, data-model work, and diagnosis API changes in the same commit.

## Later

- Confirm or fix `site.webmanifest` MIME in Nginx when server config work is explicitly approved.
- Consider adding `ARCHITECTURE.md` and `DECISIONS.md` once architecture work becomes heavier.
- Consider splitting the large `css/style.css` into clearer sections or files only after the current static-site deployment flow is stable.
- Consider making project detail pages more data-driven after project-card data structure stabilizes.
- Add a clear backend deployment/sync plan if the production site is Tencent Cloud rather than GitHub Pages.

## Blocked / Deferred

- Do not proceed with route-layer admission changes until the user explicitly approves a plan.
- Do not enable `ENABLE_DIAGNOSIS_V1=true` in default or production settings yet.
- Do not rely only on synthetic AI-generated samples for quality validation.
- Do not implement real talent-platform matching/recruiting features yet.

## Next - Invitation Diagnosis Beta Production Gate (2026-06-10)

- Stage B1 completed the protected route gate. Basic Auth covers the exact Beta static files and exact Diagnosis POST API; the static homepage index mapping is corrected and verified.
- Stage B2 completed one authorized fictional production smoke: HTTP 200, Final stage, three provider calls, no fallback, public DTO whitelist passed and no sensitive log matches.
- Do not repeat the production smoke without a new plan and explicit authorization. Do not infer invitation distribution or public-readiness approval from B2.
- Feedback, backend health/readiness and public uploads remain unopened. Keep the service `active/disabled`, port `8788` loopback-only and the public `/diagnosis/` page frozen.
- The next permitted work is a separate post-B2 review and invitation-release decision. It must assess legal sign-off, credential distribution, observation/rollback ownership and support procedures before any access is shared.
- B3.1 preparation is complete in the repository: rules, user notice, manual feedback, deletion procedure and monitoring duty checklist are documented, and the Beta client fixes `reviewConsent=false`.
- Before B3.2, decide whether systemd will be enabled or whether restart interruption is formally accepted; verify production account-key isolation, other real limits and the in-memory reset boundary; assign monitoring, deletion and cost owners; approve independent account handling; and complete human legal review.
- Do not create tester accounts with `htpasswd -c`; additions must preserve the existing password file and remain a separately authorized B3.2 operation.
- Do not invite users, change env/limits, restart or enable services, open feedback, or run another real diagnosis as part of B3.1.
- B3.2b is complete: approved production limits are active and the Diagnosis service is now `active/enabled` with bounded systemd restart frequency.
- Before B3.2c, assign monitoring, deletion and cost owners; complete human review of Beta/privacy wording; and approve the independent tester-account creation and credential-distribution procedure.
- Do not create tester accounts, modify htpasswd, deploy the B3.1 page, execute an API POST, call AI, invite users or enter B3.2c without separate authorization.

- Use `docs/diagnosis/DIAGNOSIS_BETA_DRY_RUN_REVIEW_2026-06-11.md` as the current deployment-review gate and keep the 2026-06-10 deployment plan as the archived overall plan.
- Before every server precheck, run `git fetch origin main`, require a clean worktree with `HEAD == origin/main`, and record the full deployment-candidate SHA. Never reuse a historical SHA without verification.
- The next permitted operation is a server read-only precheck of users, paths, permissions, ports, runtime binaries, existing units, active Nginx locations and webroot isolation.
- Do not run the systemd/Nginx installer drafts during that precheck; they are not dry-run commands and can mutate service state.
- Resolve the documented execution gates first: env/auth regular-file ownership, data directory mode, npm binary path, active Nginx conflicts, Beta static method restrictions, previous release and config backup.
- The server read-only precheck is complete. Use `docs/diagnosis/DIAGNOSIS_BETA_SERVER_READONLY_PRECHECK_2026-06-11.md` as the evidence record.
- Next, prepare repository-only deployment configuration drafts for the missing dedicated user, release/current layout, env/data/auth permissions, hardened systemd unit and three authenticated `^~` Nginx locations.
- Ensure the future `/diagnosis/beta/` location takes precedence over the existing static-resource regex location and define the exact no-trailing-slash behavior.
- Keep the next phase draft-only: do not create server resources, run installers, start services, reload Nginx, call AI or expose Beta/API routes.
- Review the five repository drafts under `deploy/diagnosis-beta/` using `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_DRAFT_REVIEW_2026-06-11.md`.
- Resolve systemd effective env/hardening, Basic Auth ownership/mode, Nginx alias/symlink behavior, no-trailing-slash policy, active-config merge and rollback checksum questions before producing any execution runbook.
- Treat `BETA_IDENTITY_HEADER` and `LOG_REDACTION_REQUIRED` as documented contracts, not runtime-configurable enforcement, unless a separate business-code task wires and tests them.
- Do not remove the unconditional safety exits from the command drafts during review.
- Use `docs/diagnosis/DIAGNOSIS_BETA_CONFIG_REVIEW_2026-06-11.md` to create the next human confirmation and pre-deployment checklist.
- Keep ten execution blockers open until revised drafts and evidence resolve them: full SHA-range review, unprivileged npm, isolated test data, idempotent user verification, permission/type checks, an enforced Nginx manual stop, hidden-file protection, transactional config rollback, analytics-backend verification and placeholder-key rejection.
- Do not treat conditional draft approval as deployment approval. The shell safety exits must remain until a separate reviewed execution task.
- Obtain human legal review for the updated privacy policy, terms, external AI processing disclosure, retention language, and copyright/authorization wording.
- Prepare the server release directory, dedicated no-login service user, `/etc/framespark/diagnosis-api.env`, `/var/lib/framespark-diagnosis`, and Nginx Basic Auth file under a separate approved deployment task.
- Verify the systemd and Nginx drafts manually; do not execute them as part of normal static-site deployment.
- Run local protected-route and public DTO checks before any server change.
- After explicit approval, deploy behind authentication, verify `/ready`, authentication, rate limits, redacted logs, retention cleanup, and rollback while keeping the public preview page unchanged.
- Only after the protected deployment passes, run 1-3 production smoke diagnoses using fictional material and a separately approved real-AI budget.
- Keep `/diagnosis/beta/` undiscoverable and `/api/diagnosis/` unavailable until access isolation, legal review, production smoke, and rollback rehearsal all pass.
- Invitation Beta approval is a separate decision; completion of repository code does not authorize opening it.

## Launch Window — 2026-06-08

- Before June 8, keep the public site frozen except for P0/P1 fixes.
- Do final manual observation on the Tencent Cloud production site, including mobile browsers and common share/open paths.
- If a P0/P1 public-site issue appears, fix only the affected static files and deploy with the verified sudo rsync flow.
- Do not add new public-site features before launch.
- Do not reopen diagnosis upload, talent platform, project details, registration/login, `/api/diagnosis`, V1 public routing, or internal-console work before launch.
- After June 8, resume planning for V1 diagnosis evaluation, internal control console, user system, and backend deployment as separate tasks.

## Next — Internal V1 Diagnostics UI

- `internal/diagnosis-eval` now displays saved V1 summary fields: reportV1 presence, stage reached, decision, prompt version, model, fallback, latency, maturity, stage, next step, and stop reason.
- `internal/admin-console` now shows a V1 evaluation summary area from dev sample run summary fields when available.
- A minimal real V1 sample-run link check has confirmed the path from DeepSeek V4-flash output to sample-run summary fields and both internal pages.
- Use `docs/diagnosis/V1_EVAL_STANDARD.md` before judging V1 report quality.
- Next V1 evaluation step: run 3 to 5 non-private samples through basic only, manually score them with the standard, then decide whether to proceed to advanced or final full-input tests.
- Current next action: manually score `docs/diagnosis/V1_BASIC_SAMPLE_REVIEW_2026-06-09.md`; do not run a larger batch before the manual review is complete.
- The review file has neutral summaries for the three 2026-06-09 basic sample runs. Next work should be manual scoring only; do not add more sample runs or real AI calls until those scores and reviewer notes are recorded.
- Treat the worksheet as preparation material, not model self-scoring and not a final quality decision.
- Next diagnosis work should be a Plan for modifying D0 gatekeeper / material maturity handling, basic prompt specificity, `nextStep` stability, and JSON schema stability. Do not modify `diagnosis-api` or prompt source files before that Plan is approved.
- Regression target after any future code/prompt change: Sample 03 should return D0 or a clear supplement-material result; Sample 01 should avoid unsupported "atonement" interpretation; Sample 02 should produce more specific suggestions.
- Patch 1 is complete: D0/basic boundary and `nextStep` stability now have no-AI regression coverage. Next code-facing step should be Patch 2 only after approval: basic prompt fidelity and suggestion specificity.
- Patch 2 real-AI regression is complete and documented. Next work should be manual review of `docs/diagnosis/V1_PATCH2_REAL_REGRESSION_2026-06-09.md` plus the existing V1 basic review worksheet.
- Do not run a larger real-AI batch until the manual review notes decide whether Patch 2 is sufficient or needs another prompt pass.
- V1 advanced small test review is now prepared as a Chinese-first worksheet in `docs/diagnosis/V1_ADVANCED_SAMPLE_REVIEW_2026-06-09.md`. Next work should be manual scoring and reviewer notes for Sample 01 and Sample 02 advanced outputs, plus confirmation that Sample 03 should remain D0.
- Do not run final-stage tests, full-input advanced batches, or larger real-AI batches until the advanced review notes are filled.
- Do not treat the AI stage decisions in the advanced worksheet as product approval or public-readiness approval.
- V1 final small test review is prepared in `docs/diagnosis/V1_FINAL_SAMPLE_REVIEW_2026-06-10.md`. Next work should be human review of maturity restraint, conversion-language safety, Sample 01 over-interpretation signals, and final-stage decision formatting.
- Do not rerun final, modify the final prompt, or expand the batch until the reviewer records whether the observed issues require a prompt or schema follow-up.
- Do not treat `possible_after_revision`, `continue_final`, or “整理项目档案” as approval to open public diagnosis or deploy `/api/diagnosis`.
- Review `docs/diagnosis/V1_FINAL_PATCH3B_REAL_REGRESSION_2026-06-10.md`. Patch 3b real regression is complete: unsupported high-interpretation terms, `continue_final`, unclear nextStep, and project-organization priority were stable across three runs per sample.
- Patch 4 prompt and local tests now address the remaining concrete plot/content-writing tendency. Review `docs/diagnosis/V1_FINAL_PATCH4_PLAN_2026-06-10.md` before any real regression.
- Patch 4b real regression is complete; review `docs/diagnosis/V1_FINAL_PATCH4B_REAL_REGRESSION_2026-06-10.md`. The four-part diagnostic structure is stable, but concrete story/content proposals remain in all three runs for both samples.
- Do not run more Patch 4b retries or change the final prompt without a new Plan. The next design question is whether the output contract needs stricter structured fields or post-generation validation to separate diagnosis direction from content generation.
- Keep basic, advanced, gatekeeper, public entry, production `/api/diagnosis`, and deployment state unchanged.
- Keep this first UI pass summary-only; do not build a full reportV1 detail page yet.
- Do not run real AI from the internal eval page without explicit user confirmation.
- Keep `internal/` local-only and excluded from Tencent Cloud webroot.
