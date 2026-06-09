# V1 Basic Sample Review Worksheet - 2026-06-09

Purpose: prepare three V1 basic sample runs for human review.

Rules:

- This worksheet contains summaries only.
- It does not include full sample text.
- It does not include full reportV1 text.
- It does not score the reports.
- It does not make a final pass/fail judgment.
- Reviewers should score against `docs/diagnosis/V1_EVAL_STANDARD.md`.

## Batch Overview

| Run ID | Sample type | stage | promptVersion | model | fallback | latency | JSON retry |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| `2026-06-09-v1-basic-sample-01` | Realist short synopsis | basic | v1-basic-2026-06 | deepseek-v4-flash | false | 8573ms | No |
| `2026-06-09-v1-basic-sample-02` | Fantasy short synopsis | basic | v1-basic-2026-06 | deepseek-v4-flash | false | 7307ms | No |
| `2026-06-09-v1-basic-sample-03` | Low-maturity concept | basic | v1-basic-2026-06 | deepseek-v4-flash | false | 12827ms | Yes, 1 retry |

## Review Score Blank Table

Use this table for each sample. Leave scores blank until a human reviewer fills them.

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

---

## Sample 01

Run ID: `2026-06-09-v1-basic-sample-01`

Technical summary:

- `stage`: basic
- `decision`: enter advanced diagnosis; focus on detail logic and emotional setup for short-film fit.
- `promptVersion`: v1-basic-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 8573ms
- `JSON retry`: no
- `nextStep`: stored as the generic label "下一步"; no detailed next-step text was stored.

AI core judgment summary:

- Identifies a retired dispatcher as the narrative carrier.
- Identifies a last-shift situation as the story setup.
- Identifies an incident involving a young passenger and an old ticket as the key trigger.
- Frames the central movement as a choice between rules and human feeling.
- Summarizes the ending direction as consequence-bearing and a new life transition.

AI suggestion summary:

- Review whether the key decision is logically supported.
- Review whether the emotional setup is enough for short-film length.
- Review whether the rule-versus-human-feeling conflict is specific enough.
- Continue only after checking basic story movement and material faithfulness.
- Fix the missing detailed `nextStep` if this output will be used in later review tooling.

Human review focus:

- Whether the report accurately identifies protagonist, pressure, choice, and change.
- Whether terms like redemption or inheritance add unsupported interpretation.
- Whether the suggested next check stays within the basic-stage boundary.
- Whether the output is specific enough to guide revision.
- Whether the generic `nextStep` label creates a usability issue.

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

- `stage`: basic
- `decision`: enter advanced diagnosis; evaluate character growth, plot structure, and thematic expression.
- `promptVersion`: v1-basic-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 7307ms
- `JSON retry`: no
- `nextStep`: stored as the generic label "下一步"; no detailed next-step text was stored.

AI core judgment summary:

- Identifies A Qing as the protagonist.
- Identifies the sister's illness as the motivating pressure.
- Identifies letter delivery, prophecy, mountain loop, and stone-chicken mechanism as story elements.
- Frames the key movement as discovering a trap and breaking out of it.
- Recognizes a protagonist-goal-obstacle-turning-point pattern.

AI suggestion summary:

- Review whether character growth is clear.
- Review whether the plot structure is coherent.
- Review whether the theme expression is specific.
- Review whether the fantasy mechanism drives the protagonist's choice.
- Fix the missing detailed `nextStep` if this output will be used in later review tooling.

Human review focus:

- Whether the report understands the prophecy and stone-chicken mechanism.
- Whether the report connects genre setting to the protagonist's goal.
- Whether the advice is concrete enough rather than generic.
- Whether it stays within basic diagnosis instead of doing advanced structure work.
- Whether the generic `nextStep` label creates a usability issue.

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

- `stage`: basic
- `decision`: complete character setup and story outline before returning to basic diagnosis.
- `promptVersion`: v1-basic-2026-06
- `model`: deepseek-v4-flash
- `fallback`: false
- `latency`: 12827ms
- `JSON retry`: yes, 1 retry
- `nextStep`: stored as the generic label "下一步"; no detailed next-step text was stored.

AI core judgment summary:

- Treats the material as a low-maturity concept rather than a stable story.
- Identifies a red-tie world rule as the main conceptual hook.
- Notes that the protagonist identity is not stable.
- Identifies an escape direction but also notes that the story is not yet formed.
- Interprets the red-tie device as a symbol of order, fear, or control.

AI suggestion summary:

- Clarify who the protagonist is.
- Add a clearer story outline.
- Clarify how the red-tie rule, infection label, and world rule connect.
- Turn symbolic setup into concrete events.
- Return to basic diagnosis after the material is more stable.

Human review focus:

- Whether this material should have stopped before basic diagnosis.
- Whether the symbolic reading goes beyond what the material supports.
- Whether the report correctly marks low maturity and missing story chain.
- Whether the JSON retry suggests output-format instability for this case.
- Whether the generic `nextStep` label creates a usability issue.

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

## Batch Review Notes

- Scores are intentionally blank.
- Final reviewer decisions are intentionally blank.
- This worksheet is not a public-release gate by itself.
- Do not run more real AI calls from this worksheet.
- Do not expose full samples or full reportV1 bodies in handoff summaries.
