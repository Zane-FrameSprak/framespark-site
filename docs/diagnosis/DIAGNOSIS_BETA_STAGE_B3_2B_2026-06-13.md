# Diagnosis Beta Stage B3.2b Production Limits And Service Enablement

Date: 2026-06-13

## Scope

- Locked and deployed configuration source commit: `e3d0b544689c28f4cd9b0717a8ca59a16ab63cc4`.
- Changed only the six approved production limits and the two systemd start-rate settings.
- Did not modify Nginx, Basic Auth, accounts, Beta pages, API routes, application code, or provider configuration.
- Did not submit an API request or call the AI provider.

## Repository Configuration Source

- Added `StartLimitIntervalSec=300` and `StartLimitBurst=3` to the systemd draft and installer source.
- Set production example limits to account `1`, IP `3`, global diagnoses `3`, provider daily `15`, concurrency `1`, and provider calls per diagnosis `5`.
- Shell syntax, repository scope, and `git diff --check` passed before commit and push.

## Server Backup And Update

- Root-only backup: `/etc/framespark/backups/diagnosis-b3.2b/20260613T064620Z`.
- Backup directory mode is `0700`; unit, env, and checksum manifest modes are `0600`.
- Previous unit SHA-256: `1c3168f8109778debd0d83577e36a31e55fae8f00698f3ebf2950b4b8473e674`.
- Installed unit artifact SHA-256: `1db5ef97f8a8e3afcff6bd2c72a0ddd176b68acd7beeccbd90e8d9f7b439c9`.
- Unit diff contained only the two approved `[Unit]` settings. `systemd-analyze verify` passed for the Diagnosis unit; unrelated host-unit warnings were not changed.
- The env remained a regular `root:root 0600` file. Removing the six approved keys produced an exact byte match with the backup, proving all other variables were unchanged.

## Effective Settings

```text
DIAGNOSIS_ACCOUNT_DAILY_LIMIT=1
DIAGNOSIS_IP_DAILY_LIMIT=3
DIAGNOSIS_GLOBAL_DAILY_LIMIT=3
PROVIDER_GLOBAL_DAILY_LIMIT=15
DIAGNOSIS_CONCURRENCY_LIMIT=1
PROVIDER_CALL_LIMIT_PER_DIAGNOSIS=5
StartLimitIntervalSec=300
StartLimitBurst=3
Restart=on-failure
RestartSec=5s
```

Account, IP, global-diagnosis, and concurrency state remains process memory and resets after restart. Provider daily usage remains file-persistent.

## Controlled Restart And Enablement

- Performed exactly one normal restart after the configuration update.
- Readiness completed within the 30-second bound; health also returned success.
- Service remained `active/running`, `NRestarts=0`, with InvocationID `8b5389ddec3a4fe0b22b06041dfd2af7`.
- Port `8788` remained bound only to `127.0.0.1`.
- Provider daily count remained `3`; metadata remained `1` file and review-consent records remained `0`.
- Current-invocation sensitive-log matches were `0`.
- After all checks passed, `systemctl enable` was executed without `--now`. Final state is `active/enabled`.

## External Boundary Verification

- Active Nginx site config, Beta include, and htpasswd hashes were unchanged.
- Public homepage, frozen `/diagnosis/`, and analytics health remained normal.
- Unauthenticated Beta access remained HTTP `401`.
- No feedback, Diagnosis health, or readiness public location was added.
- No diagnosis POST, AI call, account creation, invitation, or B3.2c action occurred.

## Traffic Lights

1. Deployment SHA and repository sources: green.
2. Pre-change service gate: green.
3. Unit/env backup and verification: green.
4. Unit static verification: green.
5. Six env limits: green.
6. Single controlled restart: green.
7. Readiness and health: green.
8. Active state and restart count: green.
9. Loopback-only `8788`: green.
10. Provider usage unchanged: green.
11. Nginx, htpasswd, website, and analytics boundaries: green.
12. systemd enablement: green.
13. Sensitive logging: green.

## Stop State

B3.2b is complete. The service is `active/enabled`, but no tester accounts were created, the B3.1 page was not deployed, no API POST or AI call occurred, and B3.2c has not started.
