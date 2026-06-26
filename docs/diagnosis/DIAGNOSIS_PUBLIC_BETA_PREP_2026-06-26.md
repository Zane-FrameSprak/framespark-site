# Diagnosis Public Beta Repository Preparation

Date: 2026-06-26
Owner: Codex

## Summary

The repository now prepares Diagnosis for a small public beta without user
accounts. The user-facing entry changes from invite-code input to a public beta
button. The backend adds a separate anonymous public-session path that issues
24-hour scoped cookies and reuses the existing Diagnosis identity and rate-limit
chain.

This document records repository work only. Production is not public-beta until
the backend release, env, Nginx, and static assets are deployed and verified.

## Safety Defaults

- No user registration, login, profile, user center, or diagnosis history.
- Public beta users receive an anonymous, signed, short-lived session.
- Diagnosis API still requires a valid session-derived identity.
- Initial production public-beta caps are intended to be:
  - account/session daily diagnoses: 1
  - IP daily diagnoses: 3
  - global daily diagnoses: 5
  - provider global daily calls: 30
  - concurrency: 1
  - provider calls per diagnosis: 5
- Public beta readiness rejects configs above those limits.
- Real Diagnosis POST / DeepSeek calls still require a separate production smoke decision.

## Repository Changes

- Added `ENABLE_PUBLIC_BETA_ACCESS` as a separate switch from invite-code verification.
- Added `POST /api/beta-access/public-session` for anonymous public beta session issuance.
- Kept invite-code verification and lifecycle tools for rollback or future controlled cohorts.
- Updated the homepage entry to "公测入口" and removed the code input.
- Updated Beta and legal copy from invitation beta wording to public beta wording.
- Updated no-AI tests for public sessions, scoped cookies, missing-material API checks, and production readiness limits.

## Deployment Boundary

The next production change must still be a controlled deployment:

- build a Linux release artifact from this commit;
- deploy the backend immutable release without production-host `npm ci`;
- set `ENABLE_PUBLIC_BETA_ACCESS=true`;
- keep or disable `ENABLE_BETA_CODE_ACCESS` according to rollback preference;
- ensure Nginx exposes only the public-session endpoint, exact Beta static routes, and exact Diagnosis POST;
- keep health, ready, internal routes, and feedback closed;
- deploy the updated static homepage and Beta assets;
- verify no provider/metadata/review increment during no-AI checks.

B4 T0 must not start until the no-AI production boundary and any separately
authorized one-call fictional smoke pass.
