# Diagnosis Beta Access Phase 1

Date: 2026-06-15

## Result

Phase 1 adds a disabled-by-default access-code foundation to `diagnosis-api`. It does not change the homepage, Beta static page, Nginx, Basic Auth, production server or existing Diagnosis identity chain.

The eventual first cohort is five people with one newly generated code per person. Existing `framespark-beta` and `beta-001/002/003` Basic Auth credentials are not access codes and will not be migrated.

## Contract

- Codes are stored only as HMAC-SHA256 indexes in SQLite.
- Default validity is 7 days and default `maxUses` is 5.
- A use is consumed only when a new 24-hour page/API session pair is committed.
- Disable and revoke increment `session_version`; expiry and version mismatch invalidate active sessions.
- Page and API receive separate `HttpOnly; Secure; SameSite=Strict` Host-only cookies.
- Verification accepts JSON only, requires the configured Origin, has a 4 KB body limit and treats all invalid code states as one public error.
- IP/global verification limits and cooldowns persist through service restart. Raw IP addresses, plaintext codes, cookies and request bodies are not stored.
- The internal validation endpoint only accepts loopback connections and returns a stable internal code identity, never the plaintext code.

## Storage and Management

The planned production database is `/var/lib/framespark-diagnosis/access/beta-access.sqlite`. SQLite uses WAL, foreign keys and immediate transactions. The database is a regular `0600` file outside webroot. Schema version 1 contains code, scoped session, verification counter/cooldown and redacted audit tables.

`better-sqlite3@12.10.1` is pinned. It supports Node 20, but future server promotion must still validate native installation and ABI compatibility on the target host.

The management CLI supports create/list/update/enable/disable/revoke/backup. Create requires an interactive terminal and displays each plaintext code once. List and lifecycle commands never display code/session hashes. This phase does not run the CLI against production and does not create the five real codes.

## Verification and Stop Boundary

No-AI tests cover hash-only storage, permissions, schema version, five-code defaults, scoped sessions, disable/revoke/expiry, max-use competition, persistent verification limits, strict Origin, cookies, internal validation, spoof rejection, CLI redaction and zero provider calls.

- `ENABLE_BETA_CODE_ACCESS` stays false.
- Existing Basic Auth remains the production boundary.
- No homepage or Beta page change, Nginx change, server connection, production POST, AI call, deployment, tester invitation or B4 T0 action is authorized.
- Phase 2 requires a separate approved plan for homepage UI, Nginx `auth_request`, cookie identity handoff and Basic Auth migration/rollback.
