import { isMaterialType, isMaturityLevel } from './reportV1Schema.js';

const DEFAULT_SUMMARY = '已完成当前材料的故事开发诊断。';
const DEFAULT_CORE = '材料已完成基础识别，核心故事判断仍需结合正文进一步确认。';
const DEFAULT_NEXT_STEP = '建议根据当前诊断结果继续补充和修订材料。';
const D0_SUMMARY = '当前材料不适合故事开发诊断';
const D0_NEXT_STEP = '建议补充明确的故事信息后再进行诊断。';

export function reportV1ToLegacyReport(reportV1 = {}) {
  const maturityLevel = normalizeText(reportV1.maturity_level);

  if (maturityLevel === 'D0') {
    return buildD0LegacyReport(reportV1);
  }

  return {
    summary: normalizeText(reportV1.material_summary, DEFAULT_SUMMARY),
    core: buildLegacyCore(reportV1),
    strengths: mapItemsToText(reportV1.strengths, '当前材料已具备可继续分析的基础。'),
    problems: mapItemsToText(reportV1.main_problems, '当前材料仍有需要进一步明确的问题。'),
    suggestions: mapRevisionItems(reportV1.priority_revisions),
    nextStep: buildLegacyNextStep(reportV1)
  };
}

export function normalizeReportV1ForCompat(reportV1 = {}) {
  const normalized = { ...reportV1 };
  const primaryType = normalizePrimaryMaterialType(normalized);

  if (!isMaturityLevel(normalized.maturity_level)) {
    normalized.maturity_level = 'C';
  }

  normalized.primary_material_type = primaryType;
  normalized.material_type = primaryType;
  normalized.secondary_material_types = normalizeSecondaryMaterialTypes(normalized.secondary_material_types);
  normalized.is_mixed_material = typeof normalized.is_mixed_material === 'boolean'
    ? normalized.is_mixed_material
    : normalized.secondary_material_types.length > 0;
  normalized.material_components = normalizeMaterialComponents(normalized.material_components);
  normalized.material_summary = normalizeText(normalized.material_summary);
  normalized.format_hint = normalizeText(normalized.format_hint, 'unknown');
  normalized.strengths = Array.isArray(normalized.strengths) ? normalized.strengths : [];
  normalized.main_problems = Array.isArray(normalized.main_problems) ? normalized.main_problems : [];
  normalized.priority_revisions = Array.isArray(normalized.priority_revisions) ? normalized.priority_revisions : [];
  normalized.final_assessment = isPlainObject(normalized.final_assessment)
    ? normalized.final_assessment
    : undefined;

  return normalized;
}

function normalizePrimaryMaterialType(reportV1) {
  if (isMaterialType(reportV1.primary_material_type)) {
    return reportV1.primary_material_type;
  }

  if (isMaterialType(reportV1.material_type)) {
    return reportV1.material_type;
  }

  return 'non_story_material';
}

function normalizeSecondaryMaterialTypes(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.filter(isMaterialType))];
}

function normalizeMaterialComponents(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter(isPlainObject).map(item => ({
    type: isMaterialType(item.type) ? item.type : 'non_story_material',
    label: normalizeText(item.label),
    description: normalizeText(item.description),
    confidence: normalizeConfidence(item.confidence)
  }));
}

function buildD0LegacyReport(reportV1) {
  const rejection = isPlainObject(reportV1.rejection_reason) ? reportV1.rejection_reason : {};
  const reason = normalizeText(rejection.message, normalizeText(reportV1.material_summary, '材料信息不足或类型不符合故事开发诊断范围。'));
  const suggestions = mapRevisionItems(reportV1.priority_revisions, [
    '请补充故事前提、人物、冲突、事件或叙事方向后再进行诊断。'
  ]);

  return {
    summary: D0_SUMMARY,
    core: reason,
    strengths: [],
    problems: [reason],
    suggestions,
    nextStep: D0_NEXT_STEP
  };
}

function buildLegacyCore(reportV1) {
  const storyCore = reportV1.story_core;

  if (typeof storyCore === 'string') {
    return normalizeText(storyCore, DEFAULT_CORE);
  }

  if (!isPlainObject(storyCore)) {
    return DEFAULT_CORE;
  }

  const parts = [
    storyCore.premise,
    storyCore.protagonist,
    storyCore.conflict,
    storyCore.emotional_drive,
    storyCore.theme_or_question
  ].map(value => normalizeText(value)).filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : DEFAULT_CORE;
}

function buildLegacyNextStep(reportV1) {
  const nextStep = reportV1.next_step;

  if (typeof nextStep === 'string') {
    return normalizeText(nextStep, DEFAULT_NEXT_STEP);
  }

  if (isPlainObject(nextStep)) {
    const label = normalizeText(nextStep.label);
    const detail = normalizeText(nextStep.detail);
    const combined = [label, detail].filter(Boolean).join('：');
    return combined || DEFAULT_NEXT_STEP;
  }

  return DEFAULT_NEXT_STEP;
}

function mapRevisionItems(items, fallback = ['建议先补充关键故事信息，再进入下一轮诊断。']) {
  const values = mapItemsToText(items, '');
  return values.length > 0 ? values : fallback;
}

function mapItemsToText(items, fallback) {
  if (!Array.isArray(items)) {
    return fallback ? [fallback] : [];
  }

  const values = items.map(itemToText).filter(Boolean);
  return values.length > 0 ? values : (fallback ? [fallback] : []);
}

function itemToText(item) {
  if (typeof item === 'string') {
    return normalizeText(item);
  }

  if (!isPlainObject(item)) {
    return '';
  }

  return normalizeText(
    item.detail ||
    item.action ||
    item.reason ||
    item.title ||
    item.message
  );
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
