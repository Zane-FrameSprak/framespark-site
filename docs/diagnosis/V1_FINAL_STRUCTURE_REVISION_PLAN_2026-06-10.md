# V1 Final Structure Revision Plan

Date: 2026-06-10

## Decision

Patch 4 failed because prompt prohibitions did not constrain the free-text `suggestions` container. The model could preserve the requested diagnostic format while still writing concrete plot, scene, dialogue, ending, motivation, or rule solutions. Final must therefore become a structured final assessment rather than a free-text rewrite-advice stage.

Final is now defined as: final diagnostic consolidation plus a checklist of material gaps. It must not produce story content for the author.

## Output Contract

The global schema remains `diagnosis-report-v1`. Final adds an optional `final_assessment` object with `structure_version: "v1-final-structure-1"`.

- `core_blockers[]`: stable blocker id, controlled blocker type, short problem summary, exact evidence from the submitted material, controlled impact code, short impact summary, controlled revision directions, and controlled missing-material types.
- `next_step`: a controlled action and blocker ids to address.
- `forbidden_generation_check`: model self-check for observability only. Server validation is authoritative.
- `material_summary`, `story_core`, and `strengths` are inherited from basic/advanced instead of being rewritten by final.
- Legacy `main_problems`, `priority_revisions`, `next_step`, and conversion fields are generated from server templates.

Final raw output must not contain free-text `suggestions` or unknown fields. It must not output concrete plot beats, turns, scenes, dialogue, endings, completed motivations, backstory, rule answers, or text that can be placed directly into a script.

## Validation And Retry

The final validator enforces strict keys, enums, counts, lengths, evidence substring matching, and rewrite-risk scanning. Model self-check output cannot override server validation.

The provider may be called at most twice for one final execution. The first JSON, structure, or rewrite-risk failure receives one targeted repair request. A second failure becomes `V1_FINAL_OUTPUT_UNSAFE`; the unsafe output is not returned or edited, and the existing pipeline handles fallback. Timeouts are not retried.

Logs and regression records may store error codes, retry count, stage diagnostics, prompt version, model, latency, and fallback status. They must not store or print API keys, complete source material, or complete reports.

## Compatibility

The global V1 schema version and legacy response fields remain stable. Existing `basicReport`, `finalReport`, `report`, and `reportV1` consumers continue receiving derived compatibility fields. Internal evaluation currently reads summary metadata only, so no immediate UI change is required. A later UI patch may display blockers explicitly.

## Patch Sequence

1. Patch 5a: add the structured contract, enums, normalizer, validator, compatibility templates, and no-AI tests without changing the final prompt.
2. Patch 5b: switch the final prompt, pass basic/advanced context to normalization, add one targeted repair retry, and test fallback and compatibility.
3. Patch 5c: run limited real regression for Sample 01 and Sample 02, with Sample 03 checked by the no-AI D0 gatekeeper.

Patch 5c has a total cap of six DeepSeek V4-flash provider calls, including repair calls. A sample stops after three consecutive serious failures. Passing Patch 5c does not authorize public upload, production API deployment, or MVP opening.
