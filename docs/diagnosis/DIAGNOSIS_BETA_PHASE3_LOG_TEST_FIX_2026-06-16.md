# Diagnosis Beta Phase 3 Log Test Fix

Date: 2026-06-16

## Result

Phase 3 deployment stopped before switching `current` because the server-side
`npm run test:no-ai` failed in `test-diagnosis-log-version.js`.

The failure was a test path assumption, not a production logger issue:

- `diagnosisLogger` writes metadata under `config.dataDir`.
- The Phase 3 server command correctly supplied an isolated `DIAGNOSIS_DATA_DIR`
  under `/var/tmp`.
- `test-diagnosis-log-version.js` still tried to read
  `diagnosis-api/logs/diagnosis/...` relative to the release root.
- Immutable production releases must not depend on writable `logs/` under the
  release directory.

## Fix

The test now prepares its data directory before dynamically importing the logger:

- If `DIAGNOSIS_DATA_DIR` is already set, the test uses that external isolated
  directory.
- If it is not set, the test creates a temporary directory with `fs.mkdtemp`.
- Assertions read metadata from the active test data directory, not from the
  release tree.
- The test removes its own generated metadata and index entry after completion.
- The production logger, production env, deployment drafts, Beta access API and
  SQLite schema were not changed.

## Deployment Boundary

This fix does not resume Phase 3 by itself. A later Phase 3 retry still needs a
separate authorization and must continue using an isolated `DIAGNOSIS_DATA_DIR`
for no-AI checks before any release switch or service restart.
