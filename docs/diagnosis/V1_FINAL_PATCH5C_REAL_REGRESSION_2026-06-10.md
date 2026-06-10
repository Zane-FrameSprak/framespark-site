# V1 Final Patch 5c Real Regression - 2026-06-10

## Scope

- Prompt version: `v1-final-2026-06-patch5`.
- Model: `deepseek-v4-flash`.
- Sample 01 and Sample 02 only; final stage only.
- Sample 03 was checked by the local D0 gatekeeper with no AI call.
- Total provider-call cap: 6, including final repair calls.
- No complete sample text, complete report, raw provider response, or API key is recorded here.

## Call Accounting

| Sample | Execution | Provider calls | Result | Retry / repair | Fallback |
| --- | ---: | ---: | --- | --- | --- |
| Sample 01 | 1 | 2 | Controlled `V1_FINAL_OUTPUT_UNSAFE` | One repair used; repair still failed | false |
| Sample 02 | 1 | 2 | Controlled `V1_FINAL_OUTPUT_UNSAFE` | One repair used; repair still failed | false |
| Sample 01 | 2 | 1 | Structured final accepted | None | false |
| Sample 02 | 2 | 1 | Structured final accepted | None | false |

Total DeepSeek V4-flash provider calls: 6.

## Accepted Output Summary

### Sample 01

- Stage: `final`.
- Decision: `complete_final`.
- Maturity: `B`.
- Next action: `revise_then_reassess`.
- Prompt version: `v1-final-2026-06-patch5`.
- Blocker types: `motivation_evidence_gap`, `causal_gap`, `ending_consequence_gap`.
- Provider latency: 14851ms.
- JSON / repair retry: none on the accepted execution.
- No accepted-output occurrence of `赎罪`, `救赎`, `atonement`, or `redemption`.
- No accepted-output production, selection, commercialization, or financing promise signal.

### Sample 02

- Stage: `final`.
- Decision: `complete_final`.
- Maturity: `B`.
- Next action: `revise_then_reassess`.
- Prompt version: `v1-final-2026-06-patch5`.
- Blocker types: `rule_gap`, `transition_setup_gap`.
- Provider latency: 11638ms.
- JSON / repair retry: none on the accepted execution.
- Accepted output kept the core diagnosis on rule clarity and transition setup through controlled blocker types; it did not return a free-text rule answer or scene rewrite.
- No accepted-output production, selection, commercialization, or financing promise signal.

### Sample 03

- AI calls: 0.
- Gatekeeper decision: `stop_d0`.
- Rejection code: `LOW_INFORMATION`.

## Stability And Safety Interpretation

- Both samples first required the controlled failure path: the initial output and its single repair did not pass final validation.
- Both samples then produced an accepted structured result on a separate execution without repair.
- The accepted outputs demonstrate that the new contract can produce parseable, source-gated final reports and stable legacy-compatible metadata.
- The first-execution failures mean provider compliance is not yet stable. This batch validates the safety boundary more strongly than it validates final diagnosis quality.
- Unsafe or structurally invalid output was not returned, trimmed, or silently repaired after the allowed retry.
- No public upload, production `/api/diagnosis`, MVP opening, or deployment is authorized by this result.
