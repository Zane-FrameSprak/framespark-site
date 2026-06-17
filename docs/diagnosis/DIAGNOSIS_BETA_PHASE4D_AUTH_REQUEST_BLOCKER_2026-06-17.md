# Diagnosis Beta Phase 4D Auth Request Blocker

Date: 2026-06-17

## Summary

Phase 4D attempted the reviewed Nginx `auth_request` design and stopped before
any public invite-code launch.

The production Nginx build does not include the `auth_request` module:

```text
unknown directive "auth_request"
```

`nginx -t` failed before any reload. The Beta include was restored to the
previous Basic Auth version, and the public site stayed in the existing
pre-invite-code state.

## Final Production State

- Diagnosis backend `current` remains
  `/srv/framespark/diagnosis-api/releases/e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`.
- Beta static `current` remains
  `/srv/framespark/diagnosis-beta-site/releases/9672664f0f1770f3e45b27484bd2f924030e3781`.
- `framespark-diagnosis.service` remains `active/running/enabled`.
- `NRestarts=0`.
- Local `/ready` and `/health` remain OK.
- `8788` remains loopback-only.
- Homepage remains without the invite-code entry.
- Public `/diagnosis/` remains `200`.
- Public `/diagnosis/beta/` without Basic Auth remains `401`.
- Nginx Beta include hash returned to the previous Basic Auth hash:
  `cea27af7ea2e7a43d337ec1379e47200a921174afbdbdf14ce623800879c58b4`.
- Nginx site config and htpasswd remained unchanged.
- Provider / metadata / review remained `1 / 2 / 0`.
- No diagnosis POST or AI call occurred.
- No real tester code was created.
- B4 T0 did not start.

## Additional Finding

The earlier direct edit to remove `$http_cookie` from the panel-managed
`site_total` format did not persist through the later Nginx test path. The
active source file again contains:

```text
"cookie":"$http_cookie"
```

Therefore the Cookie logging blocker is not resolved. It must be treated as
still open.

## Cleanup

The unreferenced Beta static release created during the failed attempt was
quarantined:

```text
/srv/framespark/diagnosis-beta-site/quarantine/phase4d-auth-request-failed-20260617T083110Z
```

It is not pointed to by `current`.

## Backups

Relevant backup directories:

```text
/etc/framespark/backups/nginx-site-total-no-cookie/20260617T082123Z
/etc/framespark/backups/diagnosis-phase4d-public-boundary/20260617T082742Z
/etc/framespark/backups/diagnosis-phase4d-public-boundary/20260617T083009Z
```

## Required Strategy Change

Do not continue with the Nginx `auth_request` plan unless Nginx is rebuilt or a
compatible module is installed under a separately reviewed server-maintenance
plan.

Recommended next design direction:

- Move invite-code session enforcement for `/diagnosis/beta/` static files and
  `/api/diagnosis/` into the Diagnosis API backend, then let Nginx proxy exact
  public paths to the backend without `auth_request`.
- The backend should validate the scoped HttpOnly cookies itself, set the
  stable Beta identity internally and serve only the three Beta static assets.
- Nginx should still reset forwarding headers, deny unknown subpaths, keep
  health/ready private and avoid logging cookies.

Alternative last-resort direction:

- Replace or rebuild Nginx with `auth_request` support. This is higher-risk
  server infrastructure work and should not be mixed with the invite-code
  rollout.

## Stop Status

Phase 4D public invite-code migration is blocked. The current Basic Auth Beta
boundary remains active. No tester-facing invite-code flow is live.
