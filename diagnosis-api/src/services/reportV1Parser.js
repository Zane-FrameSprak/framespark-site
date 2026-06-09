import { ApiError } from '../utils/errors.js';
import {
  CONVERSION_ADVICE_STATUSES,
  FORMAT_HINTS,
  REJECTION_REASON_CODES,
  REPORT_V1_SCHEMA_VERSION
} from './reportV1Schema.js';
import { normalizeReportV1ForCompat } from './reportV1Compat.js';

const DEFAULT_NEXT_STEP = {
  label: '继续完善材料',
  detail: '建议先补充关键故事信息，再进入下一轮诊断。'
};

export function normalizeReportV1(raw, payload = {}) {
  const source = extractReportV1Object(raw);
  assertMinimumV1Shape(source);

  const normalized = normalizeReportV1ForCompat({
    ...source,
    schema_version: REPORT_V1_SCHEMA_VERSION,
    format_hint: normalizeEnum(source.format_hint, FORMAT_HINTS, 'unknown'),
    material_summary: textOrFallback(source.material_summary, '已完成当前材料的故事开发诊断。'),
    story_core: normalizeStoryCore(source.story_core),
    strengths: normalizeStrengths(source.strengths),
    main_problems: normalizeProblems(source.main_problems),
    priority_revisions: normalizeRevisions(source.priority_revisions),
    next_step: normalizeNextStep(source.next_step),
    conversion_advice: normalizeConversionAdvice(source.conversion_advice),
    rejection_reason: normalizeRejectionReason(source.rejection_reason),
    diagnostics: normalizeDiagnostics(source.diagnostics)
  });

  normalized.schema_version = REPORT_V1_SCHEMA_VERSION;
  normalized.conversion_advice = normalizeConversionAdvice(normalized.conversion_advice);
  normalized.rejection_reason = normalizeRejectionReason(normalized.rejection_reason);
  normalized.next_step = normalizeNextStep(normalized.next_step);
  normalized.nextStep = normalized.next_step.detail;
  normalized.diagnostics = {
    ...normalizeDiagnostics(normalized.diagnostics),
    fallback: false
  };

  if (normalized.maturity_level === 'D0' && !normalized.rejection_reason.message) {
    normalized.rejection_reason.message = '当前材料不适合故事开发诊断。';
  }

  return normalized;
}

export function buildFallbackReportV1(payload = {}, legacyReport = {}, reason = 'V1_PARSE_FAILED') {
  const materialType = mapPayloadToMaterialType(payload);
  const summary = textOrFallback(legacyReport.summary, '已生成兼容诊断报告。');
  const core = textOrFallback(legacyReport.core, '材料核心判断需结合兼容报告查看。');

  return normalizeReportV1ForCompat({
    schema_version: REPORT_V1_SCHEMA_VERSION,
    material_type: materialType,
    primary_material_type: materialType,
    secondary_material_types: [],
    is_mixed_material: false,
    material_components: [],
    format_hint: 'unknown',
    maturity_level: 'C',
    material_summary: summary,
    story_core: {
      premise: core,
      protagonist: '',
      conflict: '',
      emotional_drive: '',
      theme_or_question: ''
    },
    strengths: arrayFromLegacy(legacyReport.strengths).map(detail => ({ title: '兼容报告亮点', detail })),
    main_problems: arrayFromLegacy(legacyReport.problems).map(detail => ({ title: '兼容报告问题', severity: 'medium', detail })),
    priority_revisions: arrayFromLegacy(legacyReport.suggestions).map((action, index) => ({
      priority: index + 1,
      action,
      reason: '来自旧版兼容报告。'
    })),
    next_step: {
      label: '继续修订',
      detail: textOrFallback(legacyReport.nextStep, DEFAULT_NEXT_STEP.detail),
      summary: textOrFallback(legacyReport.nextStep, DEFAULT_NEXT_STEP.detail),
      action: textOrFallback(legacyReport.nextStep, DEFAULT_NEXT_STEP.detail)
    },
    nextStep: textOrFallback(legacyReport.nextStep, DEFAULT_NEXT_STEP.detail),
    conversion_advice: {
      status: 'not_recommended',
      summary: '当前结果来自 V1 失败后的兼容兜底，不用于项目转化判断。',
      recommended_action: '建议先根据报告补充材料，再重新生成 V1 诊断。'
    },
    rejection_reason: {
      code: 'OTHER',
      message: ''
    },
    diagnostics: {
      fallback: true,
      fallback_reason: normalizeReason(reason)
    }
  });
}

function extractReportV1Object(raw) {
  if (!isPlainObject(raw)) {
    throw new ApiError(422, 'V1_REPORT_INVALID', 'V1 诊断返回不是 JSON 对象。');
  }
  if (isPlainObject(raw.reportV1)) {
    return raw.reportV1;
  }
  return raw;
}

function assertMinimumV1Shape(raw) {
  const hasMaterialType = typeof raw.material_type === 'string' || typeof raw.primary_material_type === 'string';
  const hasMaturity = typeof raw.maturity_level === 'string';

  if (!hasMaterialType || !hasMaturity) {
    throw new ApiError(422, 'V1_REPORT_INVALID', 'V1 诊断缺少必要字段 material_type/primary_material_type 或 maturity_level。');
  }
}

function normalizeStoryCore(value) {
  if (typeof value === 'string') {
    return {
      premise: value.trim(),
      protagonist: '',
      conflict: '',
      emotional_drive: '',
      theme_or_question: ''
    };
  }

  const input = isPlainObject(value) ? value : {};
  return {
    premise: textOrFallback(input.premise, ''),
    protagonist: textOrFallback(input.protagonist, ''),
    conflict: textOrFallback(input.conflict, ''),
    emotional_drive: textOrFallback(input.emotional_drive, ''),
    theme_or_question: textOrFallback(input.theme_or_question, '')
  };
}

function normalizeStrengths(values) {
  return normalizeObjectArray(values).map(item => ({
    title: textOrFallback(item.title, '具体亮点'),
    detail: textOrFallback(item.detail || item.message || item.action, '')
  })).filter(item => item.detail);
}

function normalizeProblems(values) {
  return normalizeObjectArray(values).map(item => ({
    title: textOrFallback(item.title, '主要问题'),
    severity: normalizeEnum(item.severity, ['high', 'medium', 'low'], 'medium'),
    detail: textOrFallback(item.detail || item.message || item.action, '')
  })).filter(item => item.detail);
}

function normalizeRevisions(values) {
  return normalizeObjectArray(values).map((item, index) => ({
    priority: normalizePositiveInteger(item.priority, index + 1),
    action: textOrFallback(item.action || item.detail || item.message, ''),
    reason: textOrFallback(item.reason, '')
  })).filter(item => item.action);
}

function normalizeNextStep(value) {
  if (typeof value === 'string') {
    const detail = textOrFallback(value, DEFAULT_NEXT_STEP.detail);
    return {
      label: '下一步',
      detail,
      summary: detail,
      action: detail
    };
  }

  const input = isPlainObject(value) ? value : {};
  const detail = textOrFallback(input.detail || input.summary || input.action, DEFAULT_NEXT_STEP.detail);
  return {
    label: textOrFallback(input.label, DEFAULT_NEXT_STEP.label),
    detail,
    summary: detail,
    action: detail
  };
}

function normalizeConversionAdvice(value) {
  const input = isPlainObject(value) ? value : {};
  return {
    status: normalizeEnum(input.status, CONVERSION_ADVICE_STATUSES, 'not_applicable'),
    summary: textOrFallback(input.summary, ''),
    recommended_action: textOrFallback(input.recommended_action, '')
  };
}

function normalizeRejectionReason(value) {
  const input = isPlainObject(value) ? value : {};
  return {
    code: normalizeEnum(input.code, REJECTION_REASON_CODES, 'OTHER'),
    message: textOrFallback(input.message, '')
  };
}

function normalizeDiagnostics(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeObjectArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(item => {
    if (typeof item === 'string') {
      return { detail: item };
    }
    return isPlainObject(item) ? item : null;
  }).filter(Boolean);
}

function mapPayloadToMaterialType(payload) {
  const form = payload.materialForm || payload.materialRouting?.materialForm || '';
  const effective = payload.materialType || payload.materialRouting?.effectiveDiagnosisType || '';

  if (form === 'full_script' || effective === 'short' || effective === 'feature') return 'screenplay';
  if (form === 'outline') return 'outline';
  if (form === 'synopsis') return 'synopsis';
  if (form === 'character_bio' || form === 'worldbuilding') return 'character_worldbuilding';
  if (form === 'reject') return 'non_story_material';
  return 'idea_concept';
}

function arrayFromLegacy(value) {
  return Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeReason(reason) {
  const text = String(reason?.code || reason?.message || reason || '').trim();
  return text || 'V1_PARSE_FAILED';
}

function textOrFallback(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
