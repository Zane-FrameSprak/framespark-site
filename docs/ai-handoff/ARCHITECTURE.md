# Architecture Map

Last updated: 2026-07-07
Updated by: Codex

This file is the engineering map for AI coding agents. Keep it factual and concise.

## Repository Shape

```text
framespark-site/
  index.html
  css/style.css
  js/site-data.js
  js/main.js
  js/analytics.js
  diagnosis/
  talent/
  projects/
  legal/
  internal/
  scripts/
  diagnosis-api/
  docs/
```

The repository contains both a static public site and a separate Node / Express diagnosis API. Do not assume the static-site deployment also deploys the API.

## Public Site Architecture

### Home Page

- `index.html` contains the home page skeleton and mount points.
- `js/site-data.js` contains home page content data.
- `js/main.js` renders data-driven sections and handles interactions.
- `css/style.css` contains shared styling.

Current data-driven areas:

- `FrameSparkData.projects`
- `FrameSparkData.platforms`
- `FrameSparkData.ecosystem`

Current rendering responsibilities:

- project cards
- project marquee controls
- platform cards
- ecosystem cards
- fade-in behavior

Public-site content changes should usually start in `js/site-data.js`. Do not hardcode project cards into `index.html` unless the architecture is intentionally changed.

### Project Pages

Project detail pages live in `projects/` and are currently static HTML pages.

Current pages include:

- `projects/gongxi.html`
- `projects/listing-eve.html`
- `projects/chorolove.html`
- `projects/too-advanced.html`
- `projects/template.html`

They share visual patterns through `css/style.css` and use placeholder poster panels when no real cover image is present.

### Talent Page

`talent/index.html` is currently a public development-notice page. It should not imply real talent matching, recruiting, or open project demand features are already live.

### Analytics

`js/analytics.js` tracks anonymous page views and clicks through:

- local visitor id
- session id
- event id
- page type
- target id
- hashed user agent
- screen size
- language

It posts to `/api/analytics/event` by default. Privacy copy should stay aligned with what this script actually records.

## Diagnosis API Architecture

### Beta Access and Public Session Layer

The current ordinary public Beta entry is anonymous-session based, not Basic Auth and not the invite-code form. The homepage public beta button calls `POST /api/beta-access/public-session`, which signs scoped 24-hour page/API cookies. `/diagnosis/beta/` and `POST /api/diagnosis/` are protected by backend Cookie/session validation behind exact Nginx routes.

The SQLite-backed invite-code foundation remains in the codebase for rollback or future closed cohorts. It stores hashed codes and scoped sessions under the external Diagnosis data directory, with no plaintext codes, cookies, materials or full reports. It is not the current ordinary public entry.

Public beta introduces no registration, login page, personal profile, user center, or diagnosis history. Identity is a short-lived anonymous session; logs may record only non-reversible operational identifiers and must not store full IP, User-Agent, cookies, submitted material, or full reports.

The diagnosis backend lives under `diagnosis-api/`.

Important files:

```text
diagnosis-api/src/server.js
diagnosis-api/src/routes/diagnosis.js
diagnosis-api/src/routes/feedback.js
diagnosis-api/src/routes/devSampleRuns.js
diagnosis-api/src/services/fileParser.js
diagnosis-api/src/services/devFileParser.js
diagnosis-api/src/services/materialRouter.js
diagnosis-api/src/services/guard.js
diagnosis-api/src/services/diagnosisPipeline.js
diagnosis-api/src/services/aiClient.js
diagnosis-api/src/services/reportParser.js
diagnosis-api/src/services/reportV1Schema.js
diagnosis-api/src/services/reportV1Parser.js
diagnosis-api/src/services/reportV1Compat.js
diagnosis-api/src/services/diagnosisLogger.js
diagnosis-api/src/services/diagnosisFeedbackLogger.js
```

### Public Diagnosis Flow

```text
request /api/diagnosis
→ parse text or uploaded file
→ materialRouter.routeMaterial
→ guard.validateScriptText
→ diagnosisPipeline.runDiagnosisPipeline
→ aiClient or mock engine
→ report parser / reportV1 parser
→ diagnosisLogger
→ JSON response
```

Important: route and guard happen before V1 pipeline. This means some materials may be rejected before `reportV1` can produce `D0`.

### Legacy Pipeline

The legacy pipeline uses:

- `basicDiagnosis.js`
- `advancedShortDiagnosis.js`
- `advancedFeatureDiagnosis.js`
- `advancedOtherDiagnosis.js`
- `reportParser.js`

It returns old fields such as:

- `basicReport`
- `finalReport`
- `report`
- `diagnosisDepth`
- `internalStage`

Do not remove these fields until the frontend, logs, and review tools are migrated.

### V1 Pipeline

The V1 pipeline is gated by:

```text
ENABLE_DIAGNOSIS_V1=true
```

Current behavior:

```text
if V1 disabled:
  run legacy pipeline

if V1 enabled:
  generateUnifiedDiagnosisV1
  normalize reportV1
  convert reportV1 to legacy report
  return both reportV1 and legacy fields

if V1 parse/format fails:
  fallback to legacy pipeline
  build fallback reportV1
```

Current V1 prompt:

- `diagnosis-api/src/prompts/unifiedDiagnosisV1.js`

Current V1 schema / compatibility:

- `reportV1Schema.js`
- `reportV1Parser.js`
- `reportV1Compat.js`

Do not enable V1 by default until route-level behavior, long materials, and real samples are stable.

### V1 Staged Diagnosis Direction

The future V1 mainline should be staged, not a single all-in-one run.

Plan document:

```text
diagnosis-api/docs/V1_STAGED_DIAGNOSIS_PLAN.md
```

Target flow:

```text
upload / paste
-> route parse
-> guard hard rejection only
-> materialRouter preliminary classification
-> v1Gatekeeper
-> D0 OR basic diagnosis
-> advanced diagnosis only if basic passes
-> final diagnosis only if advanced passes
-> current-stage report
```

Planned modules:

- `v1Gatekeeper`
- `v1StageRunner`
- `v1StageRouter`
- `v1StageDecision`
- `v1ReportAdapter`
- `v1EvaluationHooks`

Route / guard should keep hard rejection only: file too large, unsafe type, parse failure, empty text, severe mojibake, rate limit, or service safety limits. Information-poor, non-story, non-film-related, or low-maturity materials should produce V1 D0 after the staged boundary is implemented and tested.

## Route / Guard Layer

This is a high-risk area.

`materialRouter.js` decides material shape and can reject non-story material before the pipeline.

`guard.js` enforces length thresholds by material form. Current examples:

- `full_script`: 800 chars
- `synopsis`: 300 chars
- `outline`: 300 chars
- `fragment`: 300 chars
- `concept`: 80 chars

Any change here affects what users can submit and whether V1 can process `D0` cases.

## Internal Evaluation Architecture

Internal evaluation uses existing infrastructure and should be extended rather than replaced.

Important files:

```text
scripts/start-internal-console.js
internal/admin-console/index.html
internal/diagnosis-eval/index.html
internal/diagnosis-eval/app.js
diagnosis-api/src/routes/devSampleRuns.js
diagnosis-api/src/services/sampleRunStore.js
diagnosis-api/src/services/devFileParser.js
```

Current internal evaluation capabilities include:

- create / list sample runs
- paste text samples
- upload TXT / DOCX / text PDF samples
- store sample metadata
- run diagnosis against saved samples
- store result JSON / markdown
- inspect saved sample run summaries

The local admin console is a separate read-only operations dashboard, not a
production admin system. Its current structure is:

- left rail: expiry reminders, current state, operation-risk cards and
  allowlisted shortcuts
- top workspace: today reminders and local log/sample/review counts
- public-beta operations panel: current user-entry path, Cookie boundary,
  backend release, token limits, last smoke, B4 status, analytics note and the
  request-admission flow
- V1 evaluation summary: dev sample-run summary fields only
- traffic/user behavior: SSH-read summary JSON only, not raw logs or IP detail

The console must remain local-only at `127.0.0.1:8130`. It must not execute
Diagnosis POST requests, call AI, read `.env`, open arbitrary paths, mutate
files, restart services, deploy, or expose itself to the public web.

Future synthetic sample work should extend this system.

## Logging / Review Queues

Diagnosis logging:

- `diagnosisLogger.js`
- `diagnosis-api/logs/diagnosis/`
- `diagnosis-api/logs/diagnosis/index.json`
- `diagnosis-api/logs/diagnosis/review-queue/`

Feedback logging:

- `diagnosisFeedbackLogger.js`
- `routes/feedback.js`

Review scripts:

- `diagnosis-api/scripts/list-diagnosis-logs.js`
- `diagnosis-api/scripts/list-review-queue.js`

Current V1 limitation: logs are still mostly legacy-oriented and should later record `reportV1` fields more explicitly.

### Invitation Beta Logging and Public Contract (2026-06-10)

The MVP Beta uses a stricter public boundary than the historical development flow:

```text
protected Beta request
-> strict paste/TXT/DOCX parser
-> local material hint + V1 D0 gate
-> real staged V1 runner behind three switches
-> publicDiagnosisResponse DTO
-> metadata-only log
```

- `publicDiagnosisResponse.js` is the only user-facing result contract. Raw `reportV1`, provider diagnostics, prompt/model/retry/fallback fields, and internal paths stay server-side.
- Production V1 errors are fail-closed. Unsafe final output and staged-runner failures return controlled errors instead of a legacy fallback report.
- `diagnosisLogger.js` writes metadata under `/var/lib/framespark-diagnosis/diagnosis/metadata`; optional review-consent records use a separate 14-day directory. Default logs do not store the source filename, full material, or full report.
- `providerUsageStore.js` persists the global provider-call daily cap. Initial account/IP/request limits are process-local and are suitable only for the planned single-instance invitation Beta; multi-instance deployment requires a shared limiter.
- Beta assets live under `diagnosis-api/beta-site/`, outside the public static deployment. Current production protects the Beta page and exact Diagnosis API with backend Cookie/session validation behind Nginx exact routes. Nginx must clear trusted client identity headers before proxying; the API rejects missing/invalid session identity, disallowed origins, and exhausted limits. Feedback remains unopened.
- The production runtime target is `/srv/framespark/diagnosis-api/releases/<commit>` with a `current` symlink, a dedicated service user, env under `/etc/framespark`, data under `/var/lib`, and `127.0.0.1:8788`.

### Access-code client boundary (2026-06-15)

This is a repository-side fallback/closed-cohort capability, not the current ordinary public Beta entry.

```text
homepage code form
-> POST /api/beta-access/verify
-> scoped HttpOnly page/API cookies
-> fixed /diagnosis/beta/ navigation
```

- The homepage client treats the access code as transient input and never reads the issued cookies.
- Phase 4C validated the backend verify/session routes on loopback only. Current production does not expose the invite-code verification route as the ordinary public entry.
- If invite-code cohorts are reintroduced, the proxy layer must validate the appropriate scoped cookie and overwrite the trusted Beta identity header before forwarding to Diagnosis.
- The Beta client only treats `BETA_ACCESS_REQUIRED` as session expiry; other public Diagnosis errors retain their existing UI behavior.

### Public beta anonymous-session boundary (2026-06-26)

```text
homepage public beta button
-> POST /api/beta-access/public-session
-> signed 24-hour scoped HttpOnly page/API cookies
-> fixed /diagnosis/beta/ navigation
-> /api/diagnosis/ derives beta identity from the API cookie
```

- Public beta does not introduce user registration, profiles, a user center, or diagnosis history.
- Invite-code verification remains in the codebase for rollback or future controlled cohorts.
- Public beta identities are anonymous HMAC-derived session identities; full IP, User-Agent, cookies, submitted material, and full reports must not be logged.
- Public beta production readiness rejects limits above account/session `1`, IP `3`, global diagnoses `5`, provider daily `30`, concurrency `2`, and provider calls per diagnosis `5`; the intended first launch uses concurrency `1`.
- Production also enforces `MAX_INPUT_TOKENS=50000` and `PROVIDER_GLOBAL_DAILY_TOKEN_LIMIT=5000000` before provider calls.

## Deployment Notes

- `.github/workflows/pages.yml` deploys static site files to GitHub Pages.
- Historical project notes indicate the formal public site may be served from Tencent Cloud / Nginx.
- GitHub Pages does not deploy `diagnosis-api`.
- Production backend deployment and static-site sync need separate planning.
- Production has the Diagnosis API on loopback behind exact Nginx routes and backend Cookie/session validation. Public beta uses anonymous public-session cookies; invite-code tooling remains for rollback or future closed cohorts.
- Diagnosis API deployment plan uses `127.0.0.1:8788` because analytics-api already uses `127.0.0.1:8787`.

## High-Risk Change Areas

Plan first before modifying:

- route admission strategy
- `materialRouter.js`
- `guard.js`
- `diagnosisPipeline.js`
- V1 default enablement
- deployment scripts / server config
- data persistence / logs / sample storage
- authentication / permissions
- public diagnosis availability
- removing legacy response fields

## Preferred Evolution Path

- Keep the public site static and data-driven.
- Expand `js/site-data.js` before adding hardcoded HTML.
- Extend project cards and talent platform modules gradually.
- Keep diagnosis V1 behind a flag until tested against real materials.
- Extend internal sample-run tools for regression testing.
- Add compatibility layers before replacing old flows.
