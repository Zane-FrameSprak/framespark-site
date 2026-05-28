export const REPORT_V1_SCHEMA_VERSION = 'diagnosis-report-v1';

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
