# V1 Advanced Sample Review Worksheet - 2026-06-09

Purpose: prepare the first V1 advanced small test for human review.

Scope:

- Samples: `2026-06-09-v1-basic-sample-01`, `2026-06-09-v1-basic-sample-02`, `2026-06-09-v1-basic-sample-03`.
- Real AI was used only for Sample 01 and Sample 02 advanced-stage checks.
- Sample 03 was checked only at the gatekeeper boundary and did not enter advanced.
- Full sample text is not included here.
- Full `reportV1` body is not included here.
- API key or raw provider response is not included here.
- This worksheet records technical observations only. It does not score, approve, or reject the reports.

## Summary

| Sample | Real AI calls | stage reached | decision | promptVersion | model | fallback | latency | JSON retry |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| 01 | 1 | advanced | proceed_to_ultimate | v1-advanced-2026-06 | deepseek-v4-flash | false | 11503ms | No |
| 02 | 1 | advanced | revise stone-chicken rules and burned-letter setup before final diagnosis | v1-advanced-2026-06 | deepseek-v4-flash | false | 15224ms | No |
| 03 | 0 | D0 | stop_d0 / LOW_INFORMATION | n/a | n/a | false | 0ms | No |

Total DeepSeek requests: 2.

## Sample 01

Run ID: `2026-06-09-v1-basic-sample-01`

Technical summary:

- `stageReached`: advanced
- `decision`: proceed_to_ultimate
- `promptVersion`: v1-advanced-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 11503ms
- `JSON retry`: no
- `nextStep`: present

AI report observation summary:

- Reached advanced-stage output without fallback.
- The checked fields were more specific than the earlier basic-stage summary.
- The checked fields included stage decision and next-step signals.
- No obvious fabrication risk was detected in the checked summary fields.
- No obvious over-interpretation or generic-advice-only risk was detected in the checked summary fields.

Human review focus:

- Whether `proceed_to_ultimate` is supported by the private full advanced report.
- Whether the advanced diagnosis stays grounded in visible story material.
- Whether the output is materially more useful than the basic-stage report.
- Whether any theme, character arc, or structural judgment goes beyond the material.
- Whether the stage decision should be kept, rewritten, or constrained before future final-stage tests.

Scoring:

| Dimension | Score | Notes |
| --- | --- | --- |
| Core problem recognition | __ / 5 |  |
| Material faithfulness | __ / 5 |  |
| Hallucination control | __ / 5 |  |
| Actionability | __ / 5 |  |
| Stage separation | __ / 5 |  |
| Creative context fit | __ / 5 |  |
| User-pleasing risk | __ / 5 |  |
| Sensitive or forbidden claims | __ / 5 |  |
| User-readiness | __ / 5 |  |
| Human review need | __ / 5 |  |
| Reviewer stage decision | stop / rerun / revise prompt / continue / archive |  |

Reviewer notes:

-

---

## Sample 02

Run ID: `2026-06-09-v1-basic-sample-02`

Technical summary:

- `stageReached`: advanced
- `decision`: revise the stone-chicken rules and burned-letter turning point setup before final diagnosis.
- `promptVersion`: v1-advanced-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 15224ms
- `JSON retry`: no
- `nextStep`: present

AI report observation summary:

- Reached advanced-stage output without fallback.
- The checked fields were more specific than the earlier basic-stage summary.
- The decision references concrete story mechanics rather than only broad categories.
- No obvious fabrication risk was detected in the checked summary fields.
- No obvious over-interpretation or generic-advice-only risk was detected in the checked summary fields.

Human review focus:

- Whether the stone-chicken rule diagnosis is faithful to the material.
- Whether the burned-letter turning point advice is specific and actionable.
- Whether advanced-stage structure, character, tension, theme, and genre checks are separated clearly.
- Whether the output avoids inventing rules not present in the material.
- Whether the stage decision should require another advanced pass before any final-stage test.

Scoring:

| Dimension | Score | Notes |
| --- | --- | --- |
| Core problem recognition | __ / 5 |  |
| Material faithfulness | __ / 5 |  |
| Hallucination control | __ / 5 |  |
| Actionability | __ / 5 |  |
| Stage separation | __ / 5 |  |
| Creative context fit | __ / 5 |  |
| User-pleasing risk | __ / 5 |  |
| Sensitive or forbidden claims | __ / 5 |  |
| User-readiness | __ / 5 |  |
| Human review need | __ / 5 |  |
| Reviewer stage decision | stop / rerun / revise prompt / continue / archive |  |

Reviewer notes:

-

---

## Sample 03

Run ID: `2026-06-09-v1-basic-sample-03`

Technical summary:

- `stageReached`: D0
- `decision`: stop_d0
- `rejectionCode`: LOW_INFORMATION
- `fallback`: false
- `latency`: 0ms
- `JSON retry`: no
- Real AI call: no

Observation summary:

- Sample 03 remained at D0 and did not enter advanced.
- The gatekeeper outcome stayed `LOW_INFORMATION`.
- No advanced prompt was called for this sample.
- No fallback was triggered.
- This preserves the Patch 1 boundary for low-information material.

Human review focus:

- Whether `LOW_INFORMATION` is the correct boundary for this material.
- Whether future review should use D0 scoring rather than advanced scoring for this sample.
- Whether the material needs a separate supplement-material path.
- Whether reviewer notes should feed back into gatekeeper language.
- Whether any future rerun should remain no-advanced unless the material is expanded.

Scoring:

| Dimension | Score | Notes |
| --- | --- | --- |
| Core problem recognition | __ / 5 |  |
| Material faithfulness | __ / 5 |  |
| Hallucination control | __ / 5 |  |
| Actionability | __ / 5 |  |
| Stage separation | __ / 5 |  |
| Creative context fit | __ / 5 |  |
| User-pleasing risk | __ / 5 |  |
| Sensitive or forbidden claims | __ / 5 |  |
| User-readiness | __ / 5 |  |
| Human review need | __ / 5 |  |
| Reviewer stage decision | stop / rerun / revise prompt / continue / archive |  |

Reviewer notes:

-

## Conclusion

- The advanced small test completed within the 6-call budget using 2 real DeepSeek requests.
- Sample 01 and Sample 02 reached advanced with `fallback=false` and no JSON retry.
- Sample 03 remained `stop_d0 / LOW_INFORMATION` and made no real AI call.
- No full `reportV1`, full sample text, API key, or raw provider response was recorded.
- No code, prompt source, public site, production API, Nginx, SSL, systemd, internal UI, or deployment path changed.
- This file does not approve public diagnosis exposure, final-stage expansion, or a larger batch run.
