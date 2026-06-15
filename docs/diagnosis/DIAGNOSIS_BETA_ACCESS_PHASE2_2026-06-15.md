# Diagnosis Beta Access Phase 2

Date: 2026-06-15

## Result

Phase 2 adds the repository-only homepage access-code entry and Beta client session-expiry handling. It does not deploy or enable the Phase 1 access foundation.

The homepage diagnosis card keeps its existing `点击进入` behavior and adds a fixed `内测入口` form. The client accepts any non-empty value after trimming only outer whitespace, submits JSON to `/api/beta-access/verify`, and navigates only to the fixed `/diagnosis/beta/` path after the strict success contract is satisfied.

## Client Boundary

- The code input uses password masking and is not written to URLs, browser storage, analytics, console output or DOM attributes.
- Empty input never sends a request. Submitting locks the form and does not retry automatically.
- Invalid and rate-limited verification responses share one public message. Network, server and malformed-response failures use a generic unavailable message.
- The browser receives scoped `HttpOnly` cookies from Phase 1 but the client never reads or handles them.
- On Diagnosis API `401 + BETA_ACCESS_REQUIRED`, the Beta client clears temporary form/result state and returns to `/#diagnosis-beta-entry`.
- Business `400`, Diagnosis rate limit `429`, provider errors and non-JSON Basic Auth responses remain on the Beta page.

## Legal And Accessibility

Privacy and terms now describe the access code as controlled access, the maximum 24-hour browser credential, the absence of an account/profile system, and the current default of not retaining complete material or reports.

The entry provides an accessible label, live status region, keyboard submit behavior, visible focus treatment and a stable status height. It uses a two-column desktop row and a one-column layout at narrow mobile widths.

## Verification And Stop Boundary

No-AI frontend tests cover empty input, outer trimming, format neutrality, submission locking, fixed navigation, error mapping, session-expiry redirect, privacy boundaries and zero provider calls. Existing Phase 1 and full no-AI regressions remain required.

- `ENABLE_BETA_CODE_ACCESS` stays false.
- No production SQLite database or real access code is created.
- No Nginx, systemd, env, htpasswd, server, production POST, AI call, deployment, invitation or B4 T0 action is authorized.
- Phase 3 requires a separate plan for Nginx session validation, trusted identity handoff, Basic Auth migration and production rollback.
