# Diagnosis Beta Phase 3 Retry 2 Incident

Date: 2026-06-16

## Summary

Phase 3 retry 2 attempted to deploy the Diagnosis Beta access backend foundation
at locked commit `74a3605c5536943cf6aa68d44ff301e1ec1c2560`. The attempt stopped
red before deployment completed.

Update 2026-06-17: Phase 3 retry 2.1 later completed using the prebuilt artifact
release `d722fc3ed06ce6908a8936390455def8f735913e`. This incident remains the
record for the earlier production-host build failure; the current backend
release is deployed, while invite-code access remains disabled and Phase 4 has
not started.

The production server recovered after a Tencent Cloud console restart. The
Diagnosis production boundary was not polluted: `current`, env, systemd, Nginx
and htpasswd remained unchanged, the failed build artifacts were isolated, and
B4 T0 did not start.

## Incident Timeline

- Initial server gate passed: old `current` release, active Diagnosis service,
  healthy local `/ready` and `/health`, and loopback-only `8788`.
- Root-only backup was created at:
  `/etc/framespark/backups/diagnosis-phase3-retry2/20260616T082651Z`.
- The locked diagnosis-api archive was uploaded and a new release build began.
- During production-server `npm ci`, the command produced no output for an
  extended period.
- After interruption, SSH and public HTTPS timed out.
- The instance was restarted from Tencent Cloud console and recovered.
- The failed build release and temporary directories were isolated to
  quarantine.

## Verified Recovery State

- `current` still points to:
  `/srv/framespark/diagnosis-api/releases/683dea7fa98848cc40829b825cf4209692b7abe4`.
- `framespark-diagnosis.service` is `active/running/enabled`.
- `NRestarts=0`.
- Local `/ready` and `/health` are healthy.
- `8788` remains loopback-only.
- Homepage `https://framespark.cn/` returns `200`.
- Public `/diagnosis/` returns `200`.
- `/diagnosis/beta/` without credentials returns `401`; Basic Auth remains in
  place.
- env, systemd unit, Nginx config, Beta include and htpasswd SHA values matched
  the pre-incident baseline.
- Provider / metadata / review counts remained `1 / 2 / 0`.

## Explicit Non-Changes

- `current` was not switched.
- env was not modified.
- SQLite was not initialized.
- HMAC keys were not written.
- Diagnosis service was not restarted by the deployment attempt.
- Nginx was not modified or reloaded.
- No production POST was executed.
- No AI call was made.
- No real Beta access code was created.
- B4 T0 was not started.
- Phase 4 must not start.

## Analytics Finding

`framespark-analytics.service` had an independent failure after the instance
restart. Its unit points `WorkingDirectory` to:

```text
/tmp/framespark-site/analytics-api
```

That directory does not survive restart, so analytics failed with a CHDIR error
and repeated auto-restart behavior. This is not the same issue as the Diagnosis
Phase 3 red light and must be handled as a separate analytics stabilization
task.

## Root Cause Judgment

The red light was caused by deployment strategy, not the Phase 1/2 business
code. Running full `npm ci` and native `better-sqlite3` build work directly on
the production host can starve the small instance and affect SSH/HTTPS.

Future Diagnosis Phase 3 attempts must avoid production-host native dependency
builds.
