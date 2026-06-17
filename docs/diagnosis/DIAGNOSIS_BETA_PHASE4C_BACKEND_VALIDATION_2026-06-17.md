# Diagnosis Beta Phase 4C Backend Validation

Date: 2026-06-17

## Summary

Phase 4C enabled the Beta access-code backend routes inside the loopback-only
Diagnosis API process and validated the verify/session path with an internal
test code. It did not change Nginx, deploy the homepage invite-code entry,
deploy new Beta static assets, create real tester codes, run a diagnosis POST,
call AI, invite testers, or start B4 T0.

The public user boundary remains unchanged: `/diagnosis/beta/` still requires
the existing Basic Auth at Nginx, and public `/api/beta-access/verify` plus
`/internal/beta-session/validate` still resolve to the known static HTML
fallback rather than functional JSON API routes. Fixing that Nginx boundary is
a Phase 4D task.

## Production State After Phase 4C

- Current release: `e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`
- Previous release: `d722fc3ed06ce6908a8936390455def8f735913e`
- Service: `active/running/enabled`
- `NRestarts=0`
- Local `/ready` and `/health`: OK
- Port `8788`: `127.0.0.1` only
- Homepage: `200`
- Public `/diagnosis/`: `200`
- Public `/diagnosis/beta/` without Basic Auth: `401`
- Nginx and htpasswd: unchanged, no reload
- Provider / metadata / review counts: `1 / 2 / 0`

## Backend Access Validation

- `ENABLE_BETA_CODE_ACCESS=true` is now set in production env.
- Root-only HMAC secrets remain present and were not printed.
- SQLite access DB remains at
  `/var/lib/framespark-diagnosis/access/beta-access.sqlite`.
- An internal test code was created for loopback-only verification and then
  revoked.
- An earlier internal create attempt also left a test record; it was revoked.
- Final access DB state:
  - total code records: `2`
  - active code records: `0`
  - revoked code records: `2`
  - used-count sum: `1`
  - session records: `2`
- No real tester code exists.
- No full code value is stored in Git, docs, handoff, logs, or chat.

Loopback-only validation passed:

- `POST http://127.0.0.1:8788/api/beta-access/verify` with the internal test
  code returned `200` and the fixed redirect contract.
- Page-scoped cookie validated for `/diagnosis/beta/` with `204`.
- API-scoped cookie validated for `/api/diagnosis/` with `204`.
- Wrong-scope cookie access returned `401`.
- After revocation, the prior API cookie returned `401`.

## Notes For Phase 4D

- Public route probes for `/api/beta-access/verify` and
  `/internal/beta-session/validate` still hit static fallback HTML. Phase 4D
  must replace that with the reviewed Nginx session-validation boundary.
- Basic Auth remains the public Beta gate until Phase 4D explicitly changes it.
- The management CLI invocation path needs revalidation before creating real
  tester codes; Phase 4C used a root-only script path for the successful
  internal test and direct cleanup for one failed create attempt.
- Phase 4D must not generate the five real tester codes unless that is
  explicitly included in a later approved step.

## Forbidden Actions Still Not Taken

- No Nginx modification or reload.
- No homepage invite-code deployment.
- No new Beta static deployment.
- No real tester code creation.
- No production diagnosis POST.
- No DeepSeek or AI call.
- No invitation distribution.
- No B4 T0.
