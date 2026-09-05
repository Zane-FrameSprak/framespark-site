# Next Tasks

Last updated: 2026-09-05
Updated by: CodeBuddy

## Now

- Soft-404 is fixed in production. Nginx `location /` now uses `try_files $uri $uri/ =404;` with a separate `error_page 404 /404.html;`. Do not revert to `try_files $uri $uri/ /404.html;` — that form returns HTTP 200 for missing paths and lets search engines index unlimited empty shells. Do not write `error_page 404 = /404.html;` either; the `=` also forces a 200 and recreates the same bug.
- 《面试》 is live at `/projects/interview.html` and is currently the only finished-shoot title on the site, so it is the primary credibility asset. If the release plan changes, update the `上映` field — a stale year is worse than no year.
- Three project cards (《心鸡石》 / 《红领带》 / 《七大圣》) were removed from `js/site-data.js` because their detail pages never existed. Do not re-add a card without shipping its page first. 《红领带》 had status `制作中`, so it is still an active project and can return once it has a page.
- Analytics API remains down and its code is not present anywhere on the server. Every analytics summary file now carries a `_dataFreshness` block (`healthy`, `lastDataAt`, `staleHours`, `note`). Read `healthy=false` as "these numbers are meaningless", never as "zero visitors". Rebuilding the analytics service is a separate task needing its own plan — it is a full backend deployment, not a config edit.
- Deploy flow note: macOS ships rsync 2.6.9, which does not support `--chown`. Deploy with `rsync -av --rsync-path="sudo rsync" ...` from the repo root, then fix ownership on the server with `find /www/wwwroot/framespark.cn/ ! -name '.user.ini' -exec chown www:www {} +`. Always back up the webroot, always dry-run first, never use `--delete-excluded`.
- Homepage positioning is now `剧本诊断与短片开发` in both `<title>` and `og:title`; the earlier `垂直整合型影视公司` wording was retired as oversized for the current scope.
- Footer copyright year is `© 2026` across all 11 public HTML files.
- Diagnosis public beta is live. Production Diagnosis API `current` is `0104cfe1d3bb31f57000453618c5a03163730c1b`; `previous` is `535640213756e07a4c144f1ea4eb9df98b2e305b`. Homepage public beta UI is deployed, `/diagnosis/beta/` without a valid Cookie redirects to `/#diagnosis-beta-entry`, and exact Beta static/API routes are protected by backend Cookie session validation. `ENABLE_PUBLIC_BETA_ACCESS=true`, `ENABLE_BETA_CODE_ACCESS=false`; service is `active/running/enabled`, `NRestarts=0`, ready/health OK, and `8788` remains loopback-only.
- Homepage Diagnosis entry is intentionally a single public-beta entry now: do not re-add a separate `点击进入` button next to `进入公测` unless the product flow is redesigned.
- Production Diagnosis input admission now uses `tiktoken` with `cl100k_base` and `MAX_INPUT_TOKENS=50000` instead of the old character-count cap. The 2026-06-30 P0 rollout verified over-token requests return `TEXT_TOO_LONG` before daily-counter consumption or provider calls.
- The 2026-06-27 public beta density polish is deployed: the Beta page now aligns visually with the homepage black/gold layout language while reducing the oversized title/hero footprint so the public diagnosis form fits in a 100%-zoom desktop viewport. Shared subpage hero/section spacing was also tightened, and formal Diagnosis/talent/project detail headers now use the homepage logo asset instead of the old inline geometric mark. The homepage entry still resets from `进入中...` after browser Back/bfcache return. Keep this behavior covered when changing `js/beta-access.js`, `css/style.css`, or `diagnosis-api/beta-site/beta.css`.
- Initial public-beta caps are fixed at account/session `1`, IP `3`, global diagnoses `5`, provider daily `30`, provider tokens `5,000,000` per UTC day, concurrency `1`, and provider calls per diagnosis `5`. The provider token budget is live in production and returns `今日诊断名额已满，请明天再来` when full. Do not raise these limits before the first observation window.
- One authorized fictional real-AI smoke has been run after the P0 rollout. It returned HTTP 200, reached final stage, used 4 provider calls and 13,095 provider tokens, and exposed no internal fields in the public DTO. Do not run another real Diagnosis POST or begin B4 T0 without separate authorization.
- The local-only internal admin console is refreshed for the current public-beta state. It now has a public-beta operations panel for entry path, Cookie boundary, backend release, token limits, last smoke, B4 status, Cookie logging and the separate analytics issue. Keep it local-only; do not turn it into a production admin surface.
- Internal admin-console traffic/analytics trend summaries are refreshing again from stable server path `/opt/framespark-summary-tools`; root cron no longer points at reboot-volatile `/tmp/framespark-site`. If the trend files stop updating again, the console will show `数据过期` after 2 hours instead of silently showing stale 2026-06-16-era data as current. The trend panel also shows data source, generated time and a plain caveat that these metrics are trend indicators, not exact people counts.
- Internal admin-console V1 sample-run reads now go through the local same-origin console proxy. If `127.0.0.1:8787` is not running, the V1 panel should show “未连接” rather than a browser console network error.
- Five real `beta-tester` codes are active, each with 7-day expiry and `maxUses=5`; five orphan `beta-tester` codes from a failed generation attempt are revoked. The temporary plaintext code file was deleted after the user saved the codes. Do not log, chat, commit, or regenerate plaintext codes without a separate authorization.
- B4 T0 is still not started. Do not execute a real Diagnosis POST, call DeepSeek/AI, begin the 72-hour observation window, expand the tester cohort, or change limits/cost controls without a separate plan and explicit authorization.
- Continue to avoid Cookie/Authorization logging. The 2026-06-30 P0 fix set both the panel-managed generated `site_total` log format and the `/www/server/site_total/scripts/site_log_format.conf` source template to keep the `cookie` field empty instead of `$http_cookie`; re-check both files after any panel save, Nginx edit, route expansion, or site_total update.
- Continue to avoid production-host `npm ci` or native dependency compilation. Future backend release updates should still use the Linux prebuilt artifact flow.
- `framespark-analytics.service` has a separate stability issue: its unit points to `/tmp/framespark-site/analytics-api`, which disappears after reboot. Plan analytics stabilization separately; do not fold it into Diagnosis Phase 3.
- Older Stage A / Basic Auth / invite-code rollout bullets in historical docs are superseded by the current public beta state. Do not use those older notes to infer that the service is inactive, `8788` is unused, `/api/diagnosis/` is static 404, or Basic Auth is the ordinary tester entry.
- **Keep low-token workflow active** — routine low-risk tasks should proceed in goal mode within allowed scope and report briefly.
- **Use terminal scripts for read-only checks** where possible to reduce Codex / Claude token use.
- **Use the verified sudo rsync deploy template** for Tencent Cloud; GitHub push still does not update production.
- Keep the public site as brand display plus limited public beta entry; do not make unfinished talent or project-detail areas look open.
- Keep non-Diagnosis homepage card clicks as unavailable-state prompts until those product flows are intentionally opened.
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

- `diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md` remains the current V1 architecture reference.
- Production public beta is already live through the protected `/diagnosis/beta/` flow. Do not read older V1 notes as saying `/api/diagnosis/` is undeployed or public upload is closed.
- Do not enable `ENABLE_DIAGNOSIS_V1=true` or `ENABLE_V1_REAL_PROMPTS=true` by default without a separate quality and rollout decision.
- Do not run another real AI batch automatically. Real Diagnosis POSTs, B4 T0 and cost-limit changes still require separate authorization.
- Next useful V1 work is product-quality evaluation: prompt/schema ergonomics, staged-runner review hooks, and route/guard/D0 boundary tests.
- Do not start by changing route, guard, or materialRouter. Their hard-reject vs D0 boundary must be test-locked first.
- Keep public diagnosis upload copy limited to TXT/DOCX/paste until PDF support is separately implemented.
- Treat public PDF support as a standalone task: migrate parser logic, add tests, add error copy, and keep scanned PDF / OCR out of current scope.
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
