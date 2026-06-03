# Architecture Map

Last updated: 2026-06-03
Updated by: ChatGPT via GitHub connector

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

## Deployment Notes

- `.github/workflows/pages.yml` deploys static site files to GitHub Pages.
- Historical project notes indicate the formal public site may be served from Tencent Cloud / Nginx.
- GitHub Pages does not deploy `diagnosis-api`.
- Production backend deployment and static-site sync need separate planning.
- Production currently confirms only the `/api/analytics/` reverse proxy. `/api/diagnosis` is not wired to a live diagnosis backend yet.
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
