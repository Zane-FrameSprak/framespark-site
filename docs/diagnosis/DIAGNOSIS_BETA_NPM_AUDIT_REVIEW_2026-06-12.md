# Diagnosis Beta Production Dependency Audit Review

Review date: 2026-06-12

## Scope

This review analyzes the single moderate production dependency finding observed during Diagnosis Beta Stage A and records its minimal repository fix. The fix updates only the transitive `qs` lockfile resolution. It does not run `npm audit fix`, connect to the server, mutate the installed Stage A release, start the service, modify Nginx/systemd, call AI, or expose Beta/API routes.

## Finding

- Advisory: `GHSA-q8mj-m7cp-5q26` / `CVE-2026-8723`.
- Package before fix: `qs` version `6.15.1`.
- Package after fix: `qs` version `6.15.2`.
- Severity: moderate availability issue.
- Affected range: `>=6.11.1 <=6.15.1`.
- Patched version: `6.15.2`.
- Production dependency: yes. Before the fix, `npm audit --omit=dev` reported one moderate finding across the production tree; after the fix it reports zero findings.
- Dependency type: transitive. The application directly depends on `express`; the updated chain is `express@4.22.2 -> qs@6.15.2`, with `body-parser@1.20.5 -> qs@6.15.2` deduplicated to the same package.
- Both parent ranges are `~6.15.1`, so `6.15.2` is an allowed patch-level resolution. No major-version upgrade is required.

Official advisory: <https://github.com/advisories/GHSA-q8mj-m7cp-5q26>

## Trigger Conditions

The defect requires all of the following:

1. Application code calls `qs.stringify`.
2. Options include both `arrayFormat: 'comma'` and `encodeValuesOnly: true`.
3. An encoded array contains a literal `null` or `undefined` element.

That combination synchronously throws `TypeError`. In a normal Express request boundary, the expected effect is a failed request/HTTP 500 rather than worker termination; unguarded background or startup call sites could have a larger availability effect.

## Diagnosis API Reachability

- No Diagnosis API source, Beta client, or script imports `qs` or calls `qs.stringify`.
- Express query middleware uses `qs.parse`, not `qs.stringify`.
- Express extended-query parsing and body-parser's `qs` integration also use `qs.parse`.
- The application enables `express.json`; JSON bodies can contain `null`, but no application path feeds those values into the vulnerable stringify option combination.
- Therefore the advisory's vulnerable operation is not reachable through the current Diagnosis API request path.

## Authentication And Input Controls

- An unauthenticated public user cannot exploit this specific finding in the current code because the vulnerable stringify call site does not exist. Public health/readiness or not-found requests also traverse query parsing, not the affected stringify branch.
- The planned Nginx Basic Auth and application Beta identity guard would reduce exposure to invited users, but they are defense in depth and do not repair the package.
- Upload size/type checks, text limits, Origin checks, rate limits, and provider budgets do not directly mitigate this `qs.stringify` defect. They protect different input and abuse surfaces.
- At review time, the service remains inactive/disabled and no Beta/API route is public, so there is no running remote attack surface for this package.

## Repository Fix And Compatibility

- Classification for invitation Beta before the fix: **与当前运行路径无关**. The required API was not called, so the finding did not independently block the invitation-Beta path.
- The repository now resolves `qs` to `6.15.2`. `diagnosis-api/package.json` was not changed and `qs` was not added as a direct dependency.
- `diagnosis-api/package-lock.json` changed only the `qs` version, registry URL, and integrity value. Express remains `4.22.2` and body-parser remains `1.20.5`.
- The remediation is low compatibility risk: it is a patch release accepted by the existing Express/body-parser `~6.15.1` ranges. It does not require an Express or body-parser major upgrade.
- The installed Stage A immutable release still predates this repository fix and was not modified. A future separately authorized deployment must lock the new commit, build a new release, rerun production checks, and switch `current`; do not patch the existing release in place.
- Do not use an unreviewed blanket `npm audit fix` on the installed locked release. Do not mutate the Stage A release in place.
- If future code directly uses `qs.stringify`, add a regression test for null/undefined comma arrays and keep the package at or above `6.15.2`.

## Evidence

- Before: `npm audit --omit=dev --json` reported one moderate finding for `qs@6.15.1`.
- After: `npm audit --omit=dev --json` reports zero production vulnerabilities.
- `npm ls qs --omit=dev --all`: `express@4.22.2 -> qs@6.15.2`; `body-parser@1.20.5 -> qs@6.15.2` deduplicated.
- Static search: no project `qs` import or `qs.stringify`; installed Express/body-parser call only `qs.parse`.
- `npm run check` passed.
- All V1 no-AI suites passed, including gatekeeper/decision, staged runner and gates, stage prompts/client, final structure, unified V1 prompt, report compatibility/pipeline, and sample-run V1 summary.
- MVP input, rate-limit, public DTO, fail-closed, upload validation, DOCX safety, retention, auth/origin, and HTTP integration tests passed.
