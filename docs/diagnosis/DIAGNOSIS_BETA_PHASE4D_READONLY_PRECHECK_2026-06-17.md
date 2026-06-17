# Diagnosis Beta Phase 4D Read-Only Precheck

Date: 2026-06-17

## Summary

Phase 4D.1 read-only boundary confirmation completed and stopped before any
deployment or Nginx change.

Production is healthy and still in the pre-public-invite-code state, but Phase
4D must not proceed yet because the active `site_total` Nginx log format records
`$http_cookie`. Once invite-code sessions are public, that would risk logging
the scoped session cookies. This must be fixed or bypassed before any public
Cookie-based invite-code flow is enabled.

No files, env, Nginx config, service state, DB records or static releases were
changed during this check.

## Green Checks

- SSH recovered and production was reachable.
- `current` points to
  `/srv/framespark/diagnosis-api/releases/e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`.
- `previous` points to
  `/srv/framespark/diagnosis-api/releases/d722fc3ed06ce6908a8936390455def8f735913e`.
- `framespark-diagnosis.service` is `active/running/enabled`.
- `NRestarts=0`.
- Local `/ready` and `/health` are OK.
- `8788` listens only on `127.0.0.1`.
- Homepage returns `200`.
- Public `/diagnosis/` returns `200`.
- Public `/diagnosis/beta/` without Basic Auth returns `401`.
- Public `/api/beta-access/verify` still returns static HTML fallback, not the
  functional backend API.
- Public `/internal/beta-session/validate` still returns static HTML fallback,
  not the internal backend validator.
- Current Beta Nginx include still uses Basic Auth for exact Beta static files
  and exact `POST /api/diagnosis/`.
- `ENABLE_BETA_CODE_ACCESS=true` is present in env, with HMAC secrets present
  but not printed.
- Access DB summary remains:
  - total code records: `2`
  - active code records: `0`
  - revoked code records: `2`
  - used-count sum: `1`
  - session records: `2`
- Provider / metadata / review baseline remains `1 / 2 / 0`.
- Production homepage does not yet contain `diagnosis-beta-entry` or
  `js/beta-access.js`.
- Production Beta static release remains
  `/srv/framespark/diagnosis-beta-site/releases/9672664f0f1770f3e45b27484bd2f924030e3781`
  with `index.html`, `app.js` and `beta.css`.
- Production Beta static app does not contain the Phase 2 session-expiry client
  logic yet.

## Red Blocker

Effective Nginx config contains:

```text
"cookie":"$http_cookie"
```

inside the `site_total` log format. Phase 4D would introduce HttpOnly scoped
session cookies for invite-code access. Even though JavaScript cannot read those
cookies, Nginx can see them on requests and the current log format could record
them.

Do not proceed to Phase 4D.2, static deployment, Nginx `auth_request`, reload or
public invite-code testing until this logging boundary is corrected.

## Required Follow-Up Before Phase 4D Continues

Plan a minimal Nginx observability/logging adjustment that ensures public
invite-code session cookies are not written to any access log, syslog, timing
log or site-total pipeline.

The follow-up plan must decide whether to:

- remove `$http_cookie` from `site_total` globally, or
- disable `site_total` logging for the invite-code/Beta/API locations, or
- route these locations to a separate no-cookie log format.

Any chosen path must include:

- active-config backup
- `nginx -t`
- exactly one reload on the green path
- verification that Cookie and Authorization are absent from effective logs
- rollback to the current Basic Auth state

## Stop Status

Phase 4D.1 is complete but Phase 4D is blocked. No public invite-code flow has
been deployed. No real tester code exists. B4 T0 has not started.
