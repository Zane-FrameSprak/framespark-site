# V1 Staged Diagnosis Plan

## Position

V1 diagnosis should become the future mainline architecture, but it must be staged. It is not a single "run everything" diagnosis pass.

Current constraints:

- Keep `ENABLE_DIAGNOSIS_V1=false`.
- Keep `ENABLE_V1_STAGED_RUNNER=false`.
- Keep legacy fallback.
- Keep the public upload entry closed.
- Public upload copy only promises TXT, DOCX, and pasted text.
- PDF is not a public commitment yet.

## Core Modules

- `v1Gatekeeper`: turns admissible-but-unsuitable materials into D0 reports, or allows them into basic diagnosis.
- `v1StageRunner`: runs only the current stage and returns the current-stage report.
- `v1StageRouter`: decides which stage should run next based on current state and previous result.
- `v1StageDecision`: decides `stop_d0`, `stop_basic`, `continue_advanced`, `continue_final`, or `complete_final`.
- `v1ReportAdapter`: keeps `reportV1` and legacy report fields compatible while frontend migration is incomplete.
- `v1EvaluationHooks`: records stage, stop reason, fallback state, material type, maturity level, and prompt/model versions for internal review.

## Request Flow

```text
upload / paste
-> route parses text or file
-> guard applies hard rejection only
-> materialRouter provides preliminary classification
-> v1Gatekeeper
-> D0 report OR basic diagnosis
-> advanced diagnosis only if basic passes
-> final diagnosis only if advanced passes
-> current-stage report + legacy-compatible fields
```

## Boundary Rules

Route and guard should keep only hard rejection:

- File too large.
- Dangerous or unsupported file type.
- File cannot be parsed.
- Empty text.
- Severe mojibake or unreadable text.
- Rate limit or service safety limits.

These cases should enter V1 D0 instead of being rejected before V1:

- Information is too thin but still readable.
- Material is not a story.
- Material is not story or film-development related.
- Material has low maturity.

`materialRouter` should become a preliminary classification hint. It should not be the final rejection authority for V1.

## Stage Outputs

### D0

- `material_type` / `primary_material_type`
- `maturity_level: "D0"`
- `material_summary`
- `rejection_reason`
- minimal supplement advice
- `nextStep`: add story-development information before diagnosis

### Basic Diagnosis

Question: is this a story?

Output:

- `summary`
- `core`
- `strengths`
- `problems`
- `suggestions`
- `nextStep`

No advanced structure diagnosis in this stage.

### Advanced Diagnosis

Question: can this story stand?

Checks:

- structure
- character arc
- tension
- theme
- genre completion
- film-development potential

### Final Diagnosis

Question: is it worth moving toward project conversion?

Output should stay restrained:

- consider preparing a project file
- consider FrameSpark internal review
- consider future talent-platform collaboration

Do not promise commercial value, financing value, or production feasibility.

## Switch Strategy

- Keep `ENABLE_DIAGNOSIS_V1=false`.
- Add `ENABLE_V1_D0` only after D0 boundaries are tested.
- `ENABLE_V1_STAGED_RUNNER` exists as a future switch and remains false.
- Only `ENABLE_DIAGNOSIS_V1=true` plus `ENABLE_V1_STAGED_RUNNER=true` may enter the future staged runner branch.
- Rollout order: internal/dev -> V1 D0 -> staged runner -> limited internal smoke -> consider replacing legacy default.
- Keep legacy fallback until frontend, logs, review tools, and internal eval are migrated.
- The initial pipeline integration remains gated and uses the no-AI mock runner. It must not be treated as a real diagnosis engine.

## Test Checklist

No real AI API tests are required for the first implementation pass.

- D0 non-story material.
- D0 insufficient information.
- D0 short text boundary.
- TXT input.
- DOCX input.
- Pasted text input.
- Short-film-like material.
- Feature-film-like material.
- Prose fiction.
- Mixed material.
- `project_package`.
- `stop_d0`.
- `stop_basic`.
- `continue_advanced`.
- `continue_final`.
- `complete_final`.
- V1 failure falls back to legacy.

## Next Implementation Order

1. Add staged runner skeleton and no-AI tests.
2. Add D0 boundary tests.
3. Add stage decision tests.
4. Wire V1 runner behind new internal-only switches.
5. Add internal evaluation visibility.
6. Run controlled real AI smoke tests.

Do not start by changing route, guard, or materialRouter behavior. Their boundaries should be frozen by tests first.
