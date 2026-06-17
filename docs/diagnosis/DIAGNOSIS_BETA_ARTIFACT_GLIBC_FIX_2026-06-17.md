# Diagnosis Beta Artifact glibc Compatibility Fix

Date: 2026-06-17

## Summary

Phase 4B attempted to initialize the invite-code env and SQLite schema after
the Phase 3 backend release had been deployed. The attempt was rolled back.
Production recovered and remains healthy, but the current `d722fc3...`
artifact cannot be used to enable Beta access-code storage.

Root cause: the GitHub Actions artifact was built on `ubuntu-latest`, whose
native `better-sqlite3` module required `GLIBC_2.38`. Production is
Ubuntu glibc `2.35` with Node `v20.20.2`, module ABI `115`, `linux/x64`.

## Production State At The Failed Attempt

- Production `current`: `d722fc3ed06ce6908a8936390455def8f735913e`
- The service is healthy while `ENABLE_BETA_CODE_ACCESS` is absent/false.
- `ENABLE_BETA_CODE_ACCESS` remains absent.
- HMAC keys do not exist.
- `/var/lib/framespark-diagnosis/access` does not exist.
- No access code was created.
- Nginx and htpasswd were unchanged and not reloaded.
- No production POST, provider call, AI call, B4 T0 or Phase 4 launch occurred.

## Fix

Repository build tooling now pins the GitHub Actions release workflow to
`ubuntu-22.04`, matching production glibc `2.35`.

The release builder records:

- OS release
- glibc version
- `ldd` version line
- Node and npm versions
- platform, arch and Node modules ABI
- `better-sqlite3` version
- build runner image

The release builder also refuses to build artifacts with glibc newer than the
configured maximum, currently `2.35`.

The server-side artifact verifier now compares the artifact glibc version with
the server glibc version before extracting and loading native dependencies. If
the artifact glibc is newer than the server glibc, verification fails before
deployment.

## Next Required Step

Update: a new Diagnosis API release artifact was generated from the fixed
workflow and deployed as production release
`e16d6997c5dc4c08671c7c2f8d66d0dd989e90bf`. It was verified in server staging
and loaded `better-sqlite3` successfully on production before deployment.

Update: Phase 4B later initialized the root-only HMAC secrets and SQLite schema
on the `e16d699...` release while keeping `ENABLE_BETA_CODE_ACCESS=false`.
Invite-code access is still disabled, and no real code exists.

Update: Phase 4C later set `ENABLE_BETA_CODE_ACCESS=true` only for loopback
backend verification. One internal test code path was verified and revoked, all
test code records are revoked, no active or real tester code exists, and Nginx
still does not expose functional invite-code routes publicly.

Still forbidden until a separate execution plan is approved:

- production server `npm ci`
- Nginx changes or reload
- homepage invite-code deployment
- real access code creation
- public invite-code Nginx route changes
- production POST
- AI call
- B4 T0
