# Diagnosis Beta Phase 3 Server Release Check Fix

Date: 2026-06-16

## Result

The second Phase 3 retry stopped before switching `current` because the server
release ran `test:beta-access-frontend`. That test validates the homepage access
entry and Beta client behavior by reading repository-root files such as
`js/beta-access.js` and `index.html`.

The production Phase 3 release is intentionally diagnosis-api-only, so those
static-site files are not present. This is a check-set boundary error, not a
Phase 1/2 feature failure.

## Fix

- Added `npm run test:server-release` for diagnosis-api-only server releases.
- The server release check contains backend-safe checks only: syntax check,
  Beta access backend tests, and the no-AI backend regression.
- `test:beta-access-frontend` remains a complete-repository test for Phase 2
  and for future static-site/Beta-client deployment validation.
- `test:beta-access-frontend` now fails with a clear message when repository
  root static files are absent:
  `frontend test requires repository root; skip in diagnosis-api-only release`.

## Deployment Boundary

Future Phase 3 retries should run:

```bash
DIAGNOSIS_DATA_DIR=/var/tmp/framespark-diagnosis-build-<sha>/test-data npm run test:server-release
```

Do not copy repository-root static files into the backend release to satisfy a
frontend test. Phase 4 must separately validate the homepage entry and Beta
client static deployment before changing user-facing access.
