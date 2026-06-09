# V1 Patch 2 Real Regression - 2026-06-09

Purpose: verify Patch 2 basic prompt grounding changes with a small real DeepSeek regression.

Scope:

- Samples: `2026-06-09-v1-basic-sample-01`, `2026-06-09-v1-basic-sample-02`, `2026-06-09-v1-basic-sample-03`.
- Model: `deepseek-v4-flash`.
- Prompt version: `v1-basic-2026-06`.
- Full sample text is not included here.
- Full `reportV1` body is not included here.
- API key or raw provider response is not included here.

## Summary

| Sample | Real AI calls | stage | fallback | latency | JSON retry | Result summary |
| --- | ---: | --- | --- | ---: | --- | --- |
| 01 | 1 | basic | false | 9506ms | No | No `atonement` / `赎罪` mention detected in the checked V1 summary fields. |
| 02 | 2 | basic | false | 17770ms | Yes, 1 retry | Suggestion checks found concrete story-element, why/effect, and how-to-revise signals. |
| 03 | 0 | D0 | false | 0ms | No | Gatekeeper stopped it as `LOW_INFORMATION`; no basic/advanced AI call was made. |

Total DeepSeek requests: 3.

## Sample 01

- Run ID: `2026-06-09-v1-basic-sample-01`
- `stage`: basic
- `decision`: enter advanced diagnosis; focus on character arc and theme expression.
- `promptVersion`: v1-basic-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 9506ms
- `JSON retry`: no
- `nextStep`: present
- `atonement` / `赎罪`: not detected in checked summary fields.
- Unsupported fixed atonement judgment: not detected.

Notes:

- This verifies the specific Patch 2 regression target for unsupported fixed atonement wording in the checked fields.
- It does not replace full human quality review.

## Sample 02

- Run ID: `2026-06-09-v1-basic-sample-02`
- `stage`: basic
- `decision`: enter advanced diagnosis; further evaluate narrative structure, emotional arc, and worldbuilding completeness.
- `promptVersion`: v1-basic-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 17770ms
- `JSON retry`: yes, 1 retry
- `nextStep`: present
- `atonement` / `赎罪`: not detected.
- Suggestion specificity signals:
  - Concrete story element signal: yes.
  - Why/effect signal: yes.
  - How-to-revise signal: yes.
  - Generic-phrase-only signal: no.

Notes:

- The checked fields include concrete story-element and revision-action signals.
- The decision sentence itself still contains broad category language, so human review should inspect the private full report if more precision is required.
- The JSON retry is an observation only; Patch 2 did not modify retry behavior.

## Sample 03

- Run ID: `2026-06-09-v1-basic-sample-03`
- `stage`: D0
- `decision`: stop_d0
- `rejectionCode`: LOW_INFORMATION
- `fallback`: false
- `latency`: 0ms
- `JSON retry`: no
- `nextStep`: present
- Real AI call: no.

Notes:

- Patch 1 boundary remains intact: this low-maturity concept did not enter basic or advanced.

## Conclusion

- Patch 2 real regression was attempted and completed within the 6-call budget.
- No full `reportV1`, full sample text, API key, or raw provider response was recorded.
- No public site, production API, Nginx, SSL, systemd, advanced/final prompt, D0 gatekeeper, internal UI, or deployment path changed.
- This file records a technical regression result only; it does not approve public diagnosis exposure or replace manual review.
