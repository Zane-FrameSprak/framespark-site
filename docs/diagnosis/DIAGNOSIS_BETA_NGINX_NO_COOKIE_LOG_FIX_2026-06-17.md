# Diagnosis Beta Nginx No-Cookie Log Fix

Date: 2026-06-17

## Summary

Phase 4D.1 found that the active Nginx `site_total` log format recorded
`$http_cookie`. This would be unsafe before exposing invite-code sessions,
because scoped HttpOnly session cookies would be visible to Nginx and could be
written to the site-total logging pipeline.

The minimal fix was applied: keep the existing `cookie` JSON field in
`site_total`, but set it to an empty string instead of `$http_cookie`.

No invite-code route, static homepage, Beta static file, env, service, access
code, diagnosis POST or AI flow was changed.

## Change

File changed on the production server:

```text
/www/server/panel/vhost/nginx/0.site_total_log_format.conf
```

Effective value after reload:

```text
"cookie":""
```

The prior value was:

```text
"cookie":"$http_cookie"
```

This preserves the log schema while preventing Cookie values from being logged.

## Backup

Root-only backup:

```text
/etc/framespark/backups/nginx-site-total-no-cookie/20260617T082123Z
```

The backup contains the original `0.site_total_log_format.conf` and
`SHA256SUMS`.

## Verification

- `nginx -t`: passed
- Nginx reload: completed
- Effective config no longer contains `$http_cookie` in `site_total`
- Homepage: `200`
- Public `/diagnosis/`: `200`
- Public `/diagnosis/beta/` without Basic Auth: `401`
- Diagnosis service: `active/running/enabled`
- `NRestarts=0`
- Local `/ready` and `/health`: OK
- `8788`: loopback-only
- Public `/api/beta-access/verify`: still static HTML fallback
- Public `/internal/beta-session/validate`: still static HTML fallback
- Nginx site include and htpasswd hashes unchanged
- Provider / metadata / review remained `1 / 2 / 0`

## Current Hashes

```text
423b1e0b148c33b22a3ef861eab2f3dc99d992fdc1506dbc5fa20365defe7054  /www/server/panel/vhost/nginx/0.site_total_log_format.conf
fda5109b74fd58ae46080e5a0dd33c6d10f7e95fc3e4c573952981c7204e4b9d  /www/server/panel/vhost/nginx/framespark.cn.conf
cea27af7ea2e7a43d337ec1379e47200a921174afbdbdf14ce623800879c58b4  /www/server/nginx/conf/framespark-diagnosis-beta.locations.conf
6bb283acf80650d151204b3357f37a2cbcc35696fae963a44a1a72af7c8a3589  /www/server/nginx/conf/framespark-diagnosis-beta.htpasswd
```

## Remaining Phase 4D Work

The cookie-log blocker is resolved, but invite-code access is still not public.
Phase 4D still needs a separate controlled change for:

- homepage invite-code static deployment
- Beta static session-expiry deployment
- Nginx verify/session/auth_request boundary
- internal no-AI validation
- rollback confirmation

Do not create real tester codes, run a diagnosis POST, call AI, invite testers
or start B4 T0 yet.
