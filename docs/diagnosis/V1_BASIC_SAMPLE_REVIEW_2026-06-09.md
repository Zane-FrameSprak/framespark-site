# V1 Basic Sample Review Todo - 2026-06-09

Purpose: create a small internal review queue for V1 basic-stage quality scoring using `docs/diagnosis/V1_EVAL_STANDARD.md`.

Scope:

- Three fictional, non-private, short internal samples.
- V1 basic stage only.
- No public entry, no deployment, no user material, and no report body review in this file.

## Run Summary

| Sample | Run ID | Type | Calls | JSON retry | hasReportV1 | stageReached | decision | promptVersion | model | fallback | latencyMs |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 01 | `2026-06-09-v1-basic-sample-01` | Realist short | 1 | no | true | basic | Enter advanced diagnosis; focus on detail logic and emotional setup for short format. | v1-basic-2026-06 | deepseek-v4-flash | false | 8573 |
| 02 | `2026-06-09-v1-basic-sample-02` | Fantasy / genre short | 1 | no | true | basic | Enter advanced diagnosis; evaluate character growth, plot structure, and theme expression. | v1-basic-2026-06 | deepseek-v4-flash | false | 7307 |
| 03 | `2026-06-09-v1-basic-sample-03` | Unclear project concept | 2 | yes | true | basic | Complete character setup and story outline first, then return for basic diagnosis. | v1-basic-2026-06 | deepseek-v4-flash | false | 12827 |

## Manual Scoring Template

Score each dimension from 1 to 5 using `V1_EVAL_STANDARD.md`.

### Sample 01 - `2026-06-09-v1-basic-sample-01`

Run metadata:

- Stage / decision / promptVersion / model / fallback / latency: basic / Enter advanced diagnosis; focus on detail logic and emotional setup for short format. / v1-basic-2026-06 / deepseek-v4-flash / false / 8573ms
- JSON retry: no

AI core judgment summary:

- Identifies the material as a short story centered on retired dispatcher Lao Zhao's final workday.
- Reads the event chain as a conflict between rule enforcement and personal compassion.
- Frames the boy's old ticket as the trigger that changes Lao Zhao's choice.
- Interprets the core as farewell, atonement, and a form of passing something on.
- Notes the story movement from rule-breaking decision to consequence and new life direction.

AI main suggestion summary:

- Focus later review on detail logic around Lao Zhao's decision.
- Check whether the emotional setup is sufficient for the short format.
- Use the next stage to examine whether the human-choice turn is causally convincing.
- Keep the basic-stage review separate from deeper structure diagnosis.

Possible human-check focus:

- Whether the report invents motivation beyond the provided synopsis.
- Whether the "atonement" reading is supported by the material.
- Whether the short-film format note is specific enough to be useful.
- Whether the missing `nextStep` field should count as a P1 issue.
- Whether the decision wording overreaches beyond basic-stage scope.

| Dimension | Score | Reviewer notes |
| --- | --- | --- |
| Core problem recognition |  |  |
| Material faithfulness |  |  |
| Hallucination control |  |  |
| Actionability |  |  |
| Stage separation |  |  |
| Creative context fit |  |  |
| User-pleasing risk |  |  |
| Sensitive or forbidden claims |  |  |
| User-readiness |  |  |
| Human review need |  |  |

P0 findings:

P1 findings:

P2 findings:

Manual decision:

- [ ] stop
- [ ] rerun
- [ ] revise prompt
- [ ] continue to advanced test
- [ ] archive as passing reference

### Sample 02 - `2026-06-09-v1-basic-sample-02`

Run metadata:

- Stage / decision / promptVersion / model / fallback / latency: basic / Enter advanced diagnosis; evaluate character growth, plot structure, and theme expression. / v1-basic-2026-06 / deepseek-v4-flash / false / 7307ms
- JSON retry: no

AI core judgment summary:

- Identifies the material as a fantasy / genre short about young postman A Qing.
- Reads the central action as delivering a letter to save a sick sister.
- Notes the prophecy, mountain route, and stone-chicken trap as the main fantasy mechanism.
- Frames the ending around recognizing the trap and leaving the village.
- Keeps the basic focus mostly on whether a clear story carrier and event chain exist.

AI main suggestion summary:

- Use later review to examine character growth.
- Use later review to examine plot structure.
- Use later review to examine theme expression.
- Check whether the fantasy mechanism supports the protagonist's choice rather than remaining only a device.

Possible human-check focus:

- Whether the report distinguishes story recognition from advanced genre diagnosis.
- Whether it stays faithful to the sample's rule system and conflict.
- Whether the suggestions are too broad for direct prompt improvement.
- Whether the missing `nextStep` field should count as a P1 issue.
- Whether model language implies certainty where the sample leaves ambiguity.

| Dimension | Score | Reviewer notes |
| --- | --- | --- |
| Core problem recognition |  |  |
| Material faithfulness |  |  |
| Hallucination control |  |  |
| Actionability |  |  |
| Stage separation |  |  |
| Creative context fit |  |  |
| User-pleasing risk |  |  |
| Sensitive or forbidden claims |  |  |
| User-readiness |  |  |
| Human review need |  |  |

P0 findings:

P1 findings:

P2 findings:

Manual decision:

- [ ] stop
- [ ] rerun
- [ ] revise prompt
- [ ] continue to advanced test
- [ ] archive as passing reference

### Sample 03 - `2026-06-09-v1-basic-sample-03`

Run metadata:

- Stage / decision / promptVersion / model / fallback / latency: basic / Complete character setup and story outline first, then return for basic diagnosis. / v1-basic-2026-06 / deepseek-v4-flash / false / 12827ms
- JSON retry: yes, one retry

AI core judgment summary:

- Identifies the material as an unclear project concept rather than a fully formed story.
- Reads the red tie as a symbol of order, fear, and social control.
- Notes that the protagonist identity is unstable between possible roles.
- Recognizes a possible escape-from-city direction but marks the story as not yet shaped.
- Treats the material as needing setup work before deeper basic-stage evaluation.

AI main suggestion summary:

- Define the protagonist before another diagnosis pass.
- Build a clearer story outline.
- Clarify the world rule around the red tie and infection label.
- Turn the symbolic premise into a concrete chain of events.
- Return to basic-stage evaluation after the material has a more stable story form.

Possible human-check focus:

- Whether the report should have stopped earlier as D0 instead of returning a basic-stage result.
- Whether symbolic interpretation exceeds what the concept supports.
- Whether the decision is useful enough without a populated `nextStep`.
- Whether the JSON retry should trigger closer schema review.
- Whether this sample should be used to test low-maturity material handling.

| Dimension | Score | Reviewer notes |
| --- | --- | --- |
| Core problem recognition |  |  |
| Material faithfulness |  |  |
| Hallucination control |  |  |
| Actionability |  |  |
| Stage separation |  |  |
| Creative context fit |  |  |
| User-pleasing risk |  |  |
| Sensitive or forbidden claims |  |  |
| User-readiness |  |  |
| Human review need |  |  |

P0 findings:

P1 findings:

P2 findings:

Manual decision:

- [ ] stop
- [ ] rerun
- [ ] revise prompt
- [ ] continue to advanced test
- [ ] archive as passing reference

## Batch Decision

Reviewer:

Date:

Overall notes:

Should V1 proceed to advanced tests?

- [ ] no
- [ ] only after prompt revision
- [ ] yes, with another small non-private batch

Do not proceed to final-stage or public-entry work from this document alone.
