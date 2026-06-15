# Diagnosis Beta B4 Observability Unblock And B3.2c Account Plan

Date: 2026-06-15

## Scope

- Record the completed minimal timing-log change for Diagnosis Beta B4 observability.
- Record that B4 observation has not started.
- Plan B3.2c independent tester account creation.
- No server connection, server mutation, account creation, Nginx reload, service restart, API POST, provider call, user invitation, commit or push is included in this documentation pass.

## B4 Observability Result

- B4 blocker status: resolved.
- B4 T0 status: not started.
- 72-hour observation status: not started.
- The minimal Diagnosis timing log configuration was applied successfully in the prior controlled server step.
- `nginx -t` passed.
- logrotate dry-run passed.
- One controlled Nginx reload passed.
- The independent timing log is a JSONL access log scoped to the exact Diagnosis Beta API URI.
- Log ownership and mode were recorded as `root:www 0640`.
- Rotation is daily with 14 retained rotations.
- The service remained `active/enabled` with `NRestarts=0`.
- Port `8788` remained bound only to loopback.
- Provider usage did not increase.
- Diagnosis metadata and review-retention counts did not increase.
- Public homepage, frozen public Diagnosis page, Beta authentication and analytics remained normal.
- No API POST or provider call was executed.

## 403 Validation Note

The original no-POST validation expected an unauthenticated GET to the exact Diagnosis Beta API URI to return `401`. The actual result was `403`, and this is accepted for B4 unblock because the route rejects non-POST methods before the Basic Auth challenge.

The B4 validation target was not successful authentication. It was:

- confirm that the independent timing log writes for the exact URI;
- confirm the entry is valid seven-field JSON;
- confirm the fields are limited to time, status, request time, upstream time, remote user, method and URI;
- confirm the entry does not include credentials, cookies, request body, user text, diagnostic content or secrets.

The single unauthenticated GET produced exactly one valid JSON log entry with the expected field set. Therefore the `403` response does not block B4.

## B4 T0 Guidance

B4 T0 should not start now.

Recommended T0: after the first real invited tester completes the first real Diagnosis Beta submission, and after the operator confirms that the new timing log contains the needed request and upstream timing fields without unsafe content.

Until T0 is explicitly confirmed:

- do not count the 72-hour observation window as started;
- do not invite additional users based on this log-only unblock;
- do not treat the B4 unblock as a product-readiness decision.

## B3.2c Independent Tester Account Plan

### Target Accounts

- `beta-001`
- `beta-002`
- `beta-003`

Each account should map to one invited tester. The mapping between account and real contact must be kept only in the user's offline encrypted list. It must not enter Git, server logs, chat, shared notes or public documents.

### Creation Rules

- Use the existing Basic Auth password file.
- Add users in append/update mode only.
- Do not use `htpasswd -c`; `-c` can recreate the file and remove existing users.
- Passwords must be entered by the user interactively on the server.
- Passwords must not appear in command arguments, shell history, chat, documents, logs or scripts.
- Before editing, create a root-only backup of the existing password file and a root-only checksum manifest.
- After editing, verify the password file remains a regular file with the expected owner, group and mode.
- Editing this file does not require an Nginx reload.

### Static-Only Verification

For each account, verify only the protected static Beta page:

- no credentials: returns `401` or the previously agreed protected-route refusal;
- correct credentials: returns `200` for `/diagnosis/beta/`;
- wrong credentials: returns `401`.

Do not access `POST /api/diagnosis/`. Do not submit text. Do not call the provider. Do not modify Nginx, service state, environment, limits or feedback routes.

### Revocation Procedure

Revocation must use a temporary copy plus atomic replacement:

1. Create a root-only temporary copy of the password file.
2. Run user deletion on the temporary copy only.
3. Verify the target username is absent from the temporary copy.
4. Verify the temporary file is non-empty, regular, and has the expected owner/group/mode.
5. Atomically replace the active password file with the temporary copy.
6. Verify the revoked account can no longer access the static Beta page, and unaffected accounts still can.

Do not use commands that recreate the full file from scratch unless a restore from backup is explicitly intended.

### Failure Handling

If any account creation or verification step fails:

- restore the password file from the root-only backup;
- recheck file type, owner, group and mode;
- verify existing known access still behaves as before;
- do not create more accounts;
- do not run API POST or provider calls;
- record only the account label and failure category, not passwords or password-file contents.

## Stop State

B4 observability is unblocked, but B4 T0 has not started. B3.2c remains a plan only. No server action, account creation, POST, provider call, invitation, commit or push occurred in this documentation pass.
