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

## Current Production State

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

Generate a new Diagnosis API release artifact from the fixed workflow. Do not
reuse the current `d722fc3...` artifact for Phase 4B. The new artifact must be
verified in server staging before any env, SQLite or service action.

Still forbidden until a separate execution plan is approved:

- production server `npm ci`
- Nginx changes or reload
- homepage invite-code deployment
- real access code creation
- `ENABLE_BETA_CODE_ACCESS=true`
- production POST
- AI call
- B4 T0
