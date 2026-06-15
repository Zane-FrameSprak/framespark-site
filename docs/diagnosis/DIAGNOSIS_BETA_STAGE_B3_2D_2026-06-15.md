# Diagnosis Beta Stage B3.2d Invitation Page Deployment Record

Date: 2026-06-15

## Deployment Source

- Locked source: `9672664f0f1770f3e45b27484bd2f924030e3781`.
- Deployed files: `index.html`, `app.js`, and `beta.css` from `diagnosis-api/beta-site/`.
- File count, SHA-256 values, ownership, and permissions matched the reviewed release manifest.
- Nginx was confirmed to read the Beta static files through `/srv/framespark/diagnosis-beta-site/current`.

## Release Switch And Backup

- Installed the three files into a new immutable release directory.
- Replaced `current` with an exclusive temporary symlink created in the same directory, after same-device and target validation.
- Retained the previous release and a root-only backup at `/etc/framespark/backups/diagnosis-b3.2d/20260615T031340Z`.
- Removed upload staging after validation. The prior release was not deleted.

## Static And Content Verification

| Check | Result |
|---|---:|
| No credentials | HTTP 401 |
| Incorrect credentials | HTTP 401 |
| Authenticated `index.html` | HTTP 200 |
| Authenticated `app.js` | HTTP 200 |
| Authenticated `beta.css` | HTTP 200 |

The deployed page:

- fixes `reviewConsent=false` and provides no user path to enable full-material retention;
- states the expected 60-90 second wait and asks users not to submit repeatedly;
- requires users to anonymize materials and confirm they have the right to submit them;
- states that AI output is for creative reference only;
- adds no feedback endpoint or other public route.

## Boundary Verification

- Nginx and the password file were unchanged; there was no Nginx reload.
- Diagnosis remained `active/enabled`, `NRestarts=0`, with `8788` listening only on loopback; there was no service restart.
- The public homepage, frozen `/diagnosis/` page, and analytics remained normal.
- Provider calls stayed at `0`; diagnosis metadata stayed at `1`; review records stayed at `0`.
- No diagnosis POST, AI call, tester invitation, or real user material was involved.

## Stop State

- B3.2d is complete.
- B4 T0 and the 72-hour observation window remain not started.
- B3.2e, tester invitation, and any real diagnosis require separate authorization.
