# Diagnosis Beta Phase 4D Invite-Code Public Boundary Plan

Date: 2026-06-17

## Goal

Switch the public Beta access path from browser Basic Auth to the homepage
invite-code flow, while keeping Diagnosis protected and avoiding any real AI
diagnosis during the migration.

Phase 4D is the first public-boundary change in the invite-code rollout. It
must be implemented as a controlled server change with rollback. It must not
create the five real tester codes; that belongs to Phase 4E after Phase 4D
passes.

## Current Baseline

- Production release: `e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`
- Diagnosis service: `active/running/enabled`
- `8788`: loopback-only
- `ENABLE_BETA_CODE_ACCESS=true`
- Access DB exists and has no active code
- Public `/diagnosis/beta/`: still protected by Basic Auth
- Public `/api/beta-access/verify`: still static HTML fallback, not functional
- Public `/internal/beta-session/validate`: still static HTML fallback, not functional
- Homepage invite-code UI exists in the repository but is not deployed
- New Beta client session-expiry logic exists in the repository but is not deployed
- Provider / metadata / review baseline after Phase 4C: `1 / 2 / 0`
- B4 T0 has not started

## Non-Negotiable Boundaries

Phase 4D must not:

- execute a Diagnosis POST
- call DeepSeek or any AI provider
- create the five real tester codes
- invite testers
- start B4 T0
- expose `/health` or `/ready` publicly
- expose `/internal/beta-session/validate` directly to browsers
- leave `/api/diagnosis/` callable without a valid invite-code session
- log full invite codes, cookies, authorization headers, request bodies,
  materials, reports, keys or HMAC secrets

## Recommended Phase 4D Split

### Phase 4D.1 Read-Only Boundary Confirmation

Only inspect production state.

Confirm:

- `current` and `previous` release targets
- service active/enabled, `NRestarts=0`
- local `/ready` and `/health`
- `8788` loopback-only
- active Nginx include structure and exact Beta/API locations
- current Basic Auth directives
- public fallback behavior for `/api/beta-access/verify` and
  `/internal/beta-session/validate`
- current homepage static release path
- current Beta static `current` path
- Nginx logs do not include Cookie or Authorization
- provider / metadata / review baseline

Stop if any boundary differs from Phase 4C evidence.

### Phase 4D.2 Static Artifact Preparation

Prepare but do not yet expose the new flow.

Deploy static files to new immutable release directories:

- homepage release containing the Phase 2 invite-code entry
- Beta static release containing session-expiry client handling

Use release/current symlink switching only after local file and hash checks.
Do not modify Nginx in this step if splitting execution further. If combined
with Nginx in one maintenance window, perform static deployment before reload
but keep rollback ready.

Static checks:

- homepage contains `#diagnosis-beta-entry`
- input is `type=password`
- placeholder is `请输入你的邀请码/内测码`
- frontend only trims leading/trailing spaces and checks empty/non-empty
- code is not written to URL, storage, analytics or console
- Beta client only redirects home for `401 + BETA_ACCESS_REQUIRED`

### Phase 4D.3 Nginx Invite-Code Boundary

Modify only the existing FrameSpark site config/include.

Required public routes:

- `POST /api/beta-access/verify`
  - allowed without prior session
  - proxied to `http://127.0.0.1:8788/api/beta-access/verify`
  - method restricted to POST
  - small body limit, matching app limit
  - forwards `Origin`, `Host`, `X-Real-IP`, `X-Forwarded-Proto`
  - resets `X-Forwarded-For` to `$remote_addr`
  - strips client-supplied authorization and trusted identity headers

- `GET/HEAD /diagnosis/beta/`
  - protected by `auth_request` to loopback internal session validation
  - serves the Beta static files only after valid page-scoped session
  - on invalid session, redirects to `/#diagnosis-beta-entry`

- exact Beta static assets
  - protected by the same page-session check
  - no directory listing
  - no broad alias that exposes release directories

- `POST /api/diagnosis/`
  - protected by API-scoped session check
  - proxied to `http://127.0.0.1:8788/api/diagnosis/`
  - must overwrite `X-Framespark-Beta-User` with the identity returned by the
    session validator
  - must not trust any client-supplied identity header

Internal Nginx-only route:

- `/internal/beta-session/validate`
  - must be `internal`
  - must not be browser-callable
  - used only by `auth_request`
  - forwards cookies and the original URI/scope context required by the app

Routes that must remain closed:

- Diagnosis `/health`
- Diagnosis `/ready`
- feedback
- unknown `/api/diagnosis/*` subpaths
- unknown `/api/beta-access/*` subpaths
- direct public `/internal/*`

Run `nginx -t` before any reload. Execute at most one normal reload on the
green path.

### Phase 4D.4 Internal No-AI Validation

Create one internal temporary invite code only for validation. Do not create the
five real tester codes.

Validation flow:

1. Homepage without code: no request, shows empty-code prompt.
2. Wrong code: verify returns controlled invalid response and homepage shows
   `内测码无效或已失效`.
3. Correct internal code: verify returns success, sets HttpOnly cookies and
   navigates to `/diagnosis/beta/`.
4. Beta page loads without Basic Auth prompt.
5. Direct `/diagnosis/beta/` without session returns to homepage entry.
6. Direct `/api/diagnosis/` without API session is rejected.
7. Do not submit any diagnosis material.
8. Revoke the internal code and confirm the prior session is no longer valid.

Validation must use browser or curl checks that do not print full code, cookie
values or response bodies containing secrets.

### Phase 4D.5 Post-Reload Boundary Checks

Confirm:

- homepage 200 and shows invite-code entry
- `/diagnosis/` 200 and remains frozen
- `/diagnosis/beta/` no longer triggers browser Basic Auth
- invalid/expired invite sessions cannot enter Beta
- valid invite session can load Beta static files
- `POST /api/diagnosis/` remains inaccessible without API-scoped session
- no health/ready/feedback exposure
- Nginx/Diagnosis logs do not contain code, cookie, Authorization, material or
  report content
- provider / metadata / review unchanged
- service active/enabled, `NRestarts=0`
- `8788` remains loopback-only

## Rollback

Prepare backups before any change:

- active Nginx site config and include
- homepage static `current` target
- Beta static `current` target
- htpasswd file hash
- Diagnosis env hash
- current/previous backend release targets

Rollback actions:

1. Restore previous Nginx include/site config.
2. Run `nginx -t`.
3. Reload Nginx once.
4. Restore previous homepage and Beta static `current` links if they changed.
5. Revoke any internal test code created during Phase 4D.
6. Confirm `/diagnosis/beta/` is again Basic Auth protected.
7. Confirm homepage, `/diagnosis/`, service, ready/health and loopback `8788`
   are healthy.

Do not rollback provider persistent counts or production logs.

## Stop Conditions

Stop and rollback if any of these occur:

- `nginx -t` fails
- reload fails
- Basic Auth fallback cannot be restored
- direct public access bypasses session checks
- `/api/diagnosis/` is callable without a valid session
- invite-code validation logs code or cookie values
- service restarts unexpectedly or `NRestarts` increments
- `8788` binds outside loopback
- provider / metadata / review increments
- health/ready/feedback becomes public
- internal validator becomes directly public-callable

## Phase 4D Success Criteria

- Public users see the homepage invite-code entry.
- A valid internal invite code can enter Beta without a browser Basic Auth
  prompt.
- Invalid, expired, revoked or missing access stays out of Beta and API.
- Diagnosis API remains protected by session-derived identity.
- No real diagnosis POST or AI call occurs.
- No real tester code exists after validation.
- B4 T0 remains not started.

## After Phase 4D

Only after Phase 4D passes should Phase 4E be planned:

- generate five real tester invite codes
- define delivery process
- confirm monitoring owners
- prepare invitation wording
- still do not start B4 T0 until a tester actually begins the approved
  observation flow
