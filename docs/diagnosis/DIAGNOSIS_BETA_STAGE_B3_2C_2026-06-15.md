# Diagnosis Beta Stage B3.2c Account Preparation Record

Date: 2026-06-15

## Scope

This stage created three independent invitation-Beta account labels and verified static-page authentication only. It did not submit a diagnosis, call an AI provider, invite a tester, change Nginx, or start the B4 observation window.

## Result

- Added `beta-001`, `beta-002`, and `beta-003`; retained the existing `framespark-beta` account.
- Confirmed the four usernames are unique. Passwords and password-file contents were not recorded.
- The password file remained a regular file with owner/group `root:www` and mode `0640`.
- Account changes were prepared in an unpredictable temporary file in the same directory as the active password file, then installed with a same-filesystem atomic replacement.
- Root-only backup: `/etc/framespark/backups/diagnosis-b3.2c/20260615T024833Z`.

## Static Authentication Verification

| Check | Result |
|---|---:|
| No credentials | HTTP 401 |
| `beta-001` correct credentials | HTTP 200 |
| `beta-002` correct credentials | HTTP 200 |
| `beta-003` correct credentials | HTTP 200 |
| `beta-001` incorrect credentials | HTTP 401 |

Verification accessed only the protected static Beta page. It did not access the diagnosis POST endpoint and produced no provider, diagnosis-metadata, or review-record increase.

## Stop State

- B3.2c is complete.
- Account-to-person mapping remains outside Git in the user's offline protected list.
- No tester was invited and no credential was distributed as part of this stage.
- B4 T0 remains not started.
