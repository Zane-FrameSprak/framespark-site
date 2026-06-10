export const REPORT_V1_SCHEMA_VERSION = 'diagnosis-report-v1';
export const FINAL_STRUCTURE_VERSION = 'v1-final-structure-1';

export const FINAL_BLOCKER_TYPES = Object.freeze([
  'causal_gap',
  'rule_gap',
  'transition_setup_gap',
  'motivation_evidence_gap',
  'structural_function_gap',
  'ending_consequence_gap',
  'material_insufficiency'
]);

export const FINAL_IMPACT_CODES = Object.freeze([
  'credibility',
  'causal_clarity',
  'character_logic',
  'structural_clarity',
  'emotional_effect',
  'rule_coherence',
  'ending_closure',
  'evaluation_confidence'
]);

export const FINAL_REVISION_DIRECTIONS = Object.freeze([
  'clarify_existing_causality',
  'clarify_rule_boundaries',
  'strengthen_existing_setup',
  'clarify_choice_pressure',
  'clarify_character_response',
  'clarify_consequences',
  'clarify_structural_function',
  'clarify_existing_motivation_evidence',
  'clarify_ending_state',
  'supply_missing_context'
]);

export const FINAL_MISSING_MATERIALS = Object.freeze([
  'trigger_reason',
  'choice_basis',
  'rule_boundary',
  'prior_setup',
  'character_response',
  'consequence',
  'timeline',
  'relationship_context',
  'ending_state',
  'existing_event_evidence'
]);

export const FINAL_NEXT_STEP_ACTIONS = Object.freeze([
  'revise_then_reassess',
  'supplement_then_reassess',
  'internal_review',
  'not_recommended'
]);

export const FINAL_GENERATION_RISK_TYPES = Object.freeze([
  'concrete_plot',
  'new_turn',
  'scene_plan',
  'dialogue',
  'ending_design',
  'motivation_completion',
  'backstory_generation',
  'rule_answer'
]);

export const MATERIAL_TYPES = Object.freeze([
  'idea_concept',
  'synopsis',
  'outline',
  'screenplay',
  'prose_fiction',
  'project_package',
  'character_worldbuilding',
  'non_story_material'
]);

export const MATURITY_LEVELS = Object.freeze([
  'S',
  'A',
  'B',
  'C',
  'D0'
]);

export const CONVERSION_ADVICE_STATUSES = Object.freeze([
  'ready',
  'possible_after_revision',
  'not_recommended',
  'not_applicable'
]);

export const REJECTION_REASON_CODES = Object.freeze([
  'NON_STORY_MATERIAL',
  'TOO_SHORT',
  'TOO_LONG',
  'UNSUPPORTED_FILE',
  'LOW_INFORMATION',
  'PARSE_FAILED',
  'POLICY_UNSUPPORTED',
  'OTHER'
]);

export const FORMAT_HINTS = Object.freeze([
  'short_film_like',
  'feature_film_like',
  'series_like',
  'unknown'
]);

export function isMaterialType(value) {
  return MATERIAL_TYPES.includes(value);
}

export function isMaturityLevel(value) {
  return MATURITY_LEVELS.includes(value);
}

export function isConversionAdviceStatus(value) {
  return CONVERSION_ADVICE_STATUSES.includes(value);
}

export function isRejectionReasonCode(value) {
  return REJECTION_REASON_CODES.includes(value);
}

export function isFormatHint(value) {
  return FORMAT_HINTS.includes(value);
}
