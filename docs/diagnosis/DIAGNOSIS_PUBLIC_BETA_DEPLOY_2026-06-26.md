# Diagnosis Public Beta Deploy - 2026-06-26

## Summary

Diagnosis public beta was deployed from repository commit
`757c94ffaded6cfdf39e389979ff1c9195359d80`.

The deployment changed the ordinary tester entry from invite-code input to a
public beta session flow. It did not run a real Diagnosis POST, did not submit
story material, did not call DeepSeek/AI, did not create new access codes, and
did not start B4 T0.

## Production State

- Diagnosis API `current`:
  `/srv/framespark/diagnosis-api/releases/757c94ffaded6cfdf39e389979ff1c9195359d80`
- Diagnosis API `previous`:
  `/srv/framespark/diagnosis-api/releases/8e089c5bcf68086c787a3cafc58ba358d92e1ee1`
- Backup:
  `/etc/framespark/backups/diagnosis-public-beta-20260626T140735Z`
- `ENABLE_PUBLIC_BETA_ACCESS=true`
- `ENABLE_BETA_CODE_ACCESS=false`
- Limits:
  - account/session daily: `1`
  - IP daily: `3`
  - global diagnosis daily: `5`
  - provider daily: `30`
  - concurrency: `1`
  - provider calls per diagnosis: `5`

## Public Boundary

- Homepage shows the public beta entry.
- `/diagnosis/` remains the formal frozen diagnosis information page.
- `/diagnosis/beta/` without a valid Cookie redirects to `/#diagnosis-beta-entry`.
- `POST /api/beta-access/public-session` returns the fixed public session
  contract and sets the two scoped secure cookies.
- `GET /api/beta-access/public-session` returns `403`.
- `/api/beta-access/verify` no longer proxies to the backend and returns `404`.
- Health, readiness, feedback and internal session endpoints remain outside the
  public route surface.

## Verification

- Homepage: `200`
- `/diagnosis/`: `200`
- No-Cookie `/diagnosis/beta/`: `302` to `/#diagnosis-beta-entry`
- Public session POST: `200`, fixed body, two scoped cookies
- Cookie `/diagnosis/beta/`: `200`
- Cookie `/diagnosis/beta/app.js`: `200`
- Cookie `/diagnosis/beta/beta.css`: `200`
- Service: `active/running/enabled`, `NRestarts=0`
- Local `/ready` and `/health`: OK
- `8788`: loopback-only
- Recent Cookie log matches: `0`
- Recent sensitive journal matches: `0`
- Metadata/review/provider file counts: `2 / 0 / 1`

## Notes

- Nginx `site_total` no longer logs `$http_cookie`; the `cookie` field is kept
  with an empty value to preserve the log schema.
- Only no-material public session checks were run. No real Diagnosis POST was
  executed, so provider count and diagnosis metadata did not increment.
- B4 T0 remains a separate observation decision.
