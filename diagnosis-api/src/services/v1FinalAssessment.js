import { ApiError } from '../utils/errors.js';
import {
  FINAL_BLOCKER_TYPES,
  FINAL_GENERATION_RISK_TYPES,
  FINAL_IMPACT_CODES,
  FINAL_MISSING_MATERIALS,
  FINAL_NEXT_STEP_ACTIONS,
  FINAL_REVISION_DIRECTIONS,
  FINAL_STRUCTURE_VERSION,
  REPORT_V1_SCHEMA_VERSION
} from './reportV1Schema.js';

const TOP_LEVEL_KEYS = ['stage', 'maturity_level', 'final_assessment'];
const ASSESSMENT_KEYS = ['structure_version', 'core_blockers', 'next_step', 'forbidden_generation_check'];
const BLOCKER_KEYS = [
  'id',
  'blocker_type',
  'problem_summary',
  'evidence_from_material',
  'impact_code',
  'impact_summary',
  'revision_direction',
  'missing_materials'
];
const NEXT_STEP_KEYS = ['action', 'focus_blocker_ids'];
const SELF_CHECK_KEYS = ['passed', 'risk_types', 'note'];

const BLOCKER_LABELS = Object.freeze({
  causal_gap: '因果缺口',
  rule_gap: '规则缺口',
  transition_setup_gap: '转折铺垫缺口',
  motivation_evidence_gap: '动机依据缺口',
  structural_function_gap: '结构功能缺口',
  ending_consequence_gap: '结局后果缺口',
  material_insufficiency: '材料信息不足'
});

const DIRECTION_LABELS = Object.freeze({
  clarify_existing_causality: '明确材料中已有事件的因果关系',
  clarify_rule_boundaries: '明确材料中已有规则的边界',
  strengthen_existing_setup: '补足现有转折所需的前置铺垫',
  clarify_choice_pressure: '明确人物作出选择时已有的压力',
  clarify_character_response: '明确人物对既有事件的反应',
  clarify_consequences: '明确既有选择或事件的后果',
  clarify_structural_function: '明确现有段落或事件的结构功能',
  clarify_existing_motivation_evidence: '补足材料中已有动机的依据',
  clarify_ending_state: '明确材料已有结尾方向的状态与后果',
  supply_missing_context: '补充完成判断所缺少的背景信息'
});

const MATERIAL_LABELS = Object.freeze({
  trigger_reason: '触发原因',
  choice_basis: '选择依据',
  rule_boundary: '规则边界',
  prior_setup: '前置铺垫',
  character_response: '人物反应',
  consequence: '后果',
  timeline: '时间线',
  relationship_context: '关系背景',
  ending_state: '结尾状态',
  existing_event_evidence: '既有事件依据'
});

const NEXT_STEP_TEMPLATES = Object.freeze({
  revise_then_reassess: {
    label: '修改后再评估',
    detail: '请先处理列出的核心阻塞问题，再进行下一轮内部评估。'
  },
  supplement_then_reassess: {
    label: '补充后再评估',
    detail: '请先补充列出的必要材料，再进行下一轮内部评估。'
  },
  internal_review: {
    label: '进入内部评估',
    detail: '当前材料可进入内部评估，但不代表项目入选、拍摄或商业结果。'
  },
  not_recommended: {
    label: '暂不建议推进',
    detail: '当前材料暂不建议进入项目转化，应先处理核心故事与材料问题。'
  }
});

const REWRITE_PATTERNS = [
  /(?:可以|建议|应当|需要|可)(?:让|安排|设定|设计|新增|加入|写入|补写|改成|改为)/i,
  /(?:新增|设计|安排|补写|加入|设置).{0,16}(?:桥段|转折|场景|台词|结局|动机|背景|规则|事件|秘密|关系)/i,
  /(?:让|安排)(?:主角|主人公|人物|角色|配角).{0,30}(?:发现|得知|决定|选择|说出|来到|离开|死亡|牺牲|原谅|揭露)/i,
  /(?:台词|对白)(?:可以|建议|改为|写成|为)[：:]/i,
  /(?:结局|结尾)(?:可以|建议|改为|写成|安排为)[：:]?/i
];
const HIGH_INTERPRETATION_TERMS = ['赎罪', '救赎', 'atonement', 'redemption'];
const PROMISE_PATTERNS = [
  /保证(?:拍摄|入选|商业化|融资|签约|发行)/,
  /(?:一定|必然)(?:会|能够).{0,10}(?:成功|入选|拍摄|融资|商业化)/,
  /(?:拍摄就绪|商业价值明确|已成熟可投递)/
];

export function normalizeV1FinalAssessment(raw, context = {}) {
  assertPlainObject(raw, 'V1 final 输出必须是 JSON 对象。');
  assertExactKeys(raw, TOP_LEVEL_KEYS, 'V1 final 顶层');
  if (raw.stage !== 'final') {
    failStructure('V1 final stage 必须为 final。');
  }
  if (!['S', 'A', 'B', 'C'].includes(raw.maturity_level)) {
    failStructure('V1 final maturity_level 必须为 S/A/B/C。');
  }

  const assessment = raw.final_assessment;
  assertPlainObject(assessment, 'V1 final 缺少 final_assessment。');
  assertExactKeys(assessment, ASSESSMENT_KEYS, 'final_assessment');
  if (assessment.structure_version !== FINAL_STRUCTURE_VERSION) {
    failStructure(`final_assessment.structure_version 必须为 ${FINAL_STRUCTURE_VERSION}。`);
  }

  const blockers = normalizeBlockers(assessment.core_blockers, context.sourceText);
  const nextStep = normalizeFinalNextStep(assessment.next_step, blockers);
  const selfCheck = normalizeSelfCheck(assessment.forbidden_generation_check);
  const finalAssessment = {
    structure_version: FINAL_STRUCTURE_VERSION,
    core_blockers: blockers,
    next_step: nextStep,
    forbidden_generation_check: selfCheck
  };

  assertNoRewriteRisk(finalAssessment, context.sourceText);
  return buildCanonicalFinalReport(raw, finalAssessment, context);
}

export function isFinalOutputValidationError(error) {
  return error instanceof ApiError && [
    'V1_FINAL_STRUCTURE_INVALID',
    'V1_FINAL_REWRITE_RISK'
  ].includes(error.code);
}

function normalizeBlockers(value, sourceText) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) {
    failStructure('core_blockers 必须包含 1 到 5 项。');
  }

  const ids = new Set();
  return value.map((item, index) => {
    assertPlainObject(item, `core_blockers[${index}] 必须是对象。`);
    assertExactKeys(item, BLOCKER_KEYS, `core_blockers[${index}]`);
    const id = requireText(item.id, 32, `core_blockers[${index}].id`);
    if (!/^[a-z][a-z0-9_-]*$/i.test(id) || ids.has(id)) {
      failStructure(`core_blockers[${index}].id 必须唯一且使用安全标识符。`);
    }
    ids.add(id);

    const evidence = normalizeStringArray(item.evidence_from_material, {
      min: 1,
      max: 3,
      maxLength: 40,
      field: `core_blockers[${index}].evidence_from_material`
    });
    for (const quote of evidence) {
      if (!sourceContainsEvidence(sourceText, quote)) {
        failStructure(`core_blockers[${index}] 包含无法在原文中验证的 evidence。`);
      }
    }

    return {
      id,
      blocker_type: requireEnum(item.blocker_type, FINAL_BLOCKER_TYPES, `core_blockers[${index}].blocker_type`),
      problem_summary: requireText(item.problem_summary, 120, `core_blockers[${index}].problem_summary`),
      evidence_from_material: evidence,
      impact_code: requireEnum(item.impact_code, FINAL_IMPACT_CODES, `core_blockers[${index}].impact_code`),
      impact_summary: requireText(item.impact_summary, 120, `core_blockers[${index}].impact_summary`),
      revision_direction: normalizeEnumArray(item.revision_direction, FINAL_REVISION_DIRECTIONS, 1, 3, `core_blockers[${index}].revision_direction`),
      missing_materials: normalizeEnumArray(item.missing_materials, FINAL_MISSING_MATERIALS, 0, 5, `core_blockers[${index}].missing_materials`)
    };
  });
}

function normalizeFinalNextStep(value, blockers) {
  assertPlainObject(value, 'final_assessment.next_step 必须是对象。');
  assertExactKeys(value, NEXT_STEP_KEYS, 'final_assessment.next_step');
  const action = requireEnum(value.action, FINAL_NEXT_STEP_ACTIONS, 'final_assessment.next_step.action');
  const focusIds = normalizeStringArray(value.focus_blocker_ids, {
    min: action === 'internal_review' ? 0 : 1,
    max: blockers.length,
    maxLength: 32,
    field: 'final_assessment.next_step.focus_blocker_ids'
  });
  const blockerIds = new Set(blockers.map(item => item.id));
  if (focusIds.some(id => !blockerIds.has(id))) {
    failStructure('next_step.focus_blocker_ids 必须引用现有 blocker id。');
  }
  return { action, focus_blocker_ids: [...new Set(focusIds)] };
}

function normalizeSelfCheck(value) {
  assertPlainObject(value, 'forbidden_generation_check 必须是对象。');
  assertExactKeys(value, SELF_CHECK_KEYS, 'forbidden_generation_check');
  if (typeof value.passed !== 'boolean') {
    failStructure('forbidden_generation_check.passed 必须是 boolean。');
  }
  const riskTypes = normalizeEnumArray(
    value.risk_types,
    FINAL_GENERATION_RISK_TYPES,
    0,
    FINAL_GENERATION_RISK_TYPES.length,
    'forbidden_generation_check.risk_types'
  );
  const note = optionalText(value.note, 120, 'forbidden_generation_check.note');
  if (!value.passed || riskTypes.length > 0) {
    failRewrite('模型自检报告存在具体代写风险。');
  }
  return { passed: true, risk_types: [], note };
}

function assertNoRewriteRisk(assessment, sourceText) {
  const text = assessment.core_blockers.flatMap(item => [
    item.problem_summary,
    item.impact_summary
  ]).concat(assessment.forbidden_generation_check.note).join('\n');

  if (REWRITE_PATTERNS.some(pattern => pattern.test(text))) {
    failRewrite('V1 final 输出包含具体代写信号。');
  }
  if (PROMISE_PATTERNS.some(pattern => pattern.test(text))) {
    failRewrite('V1 final 输出包含结果承诺。');
  }

  const normalizedSource = normalizeComparable(sourceText).toLowerCase();
  const normalizedOutput = text.toLowerCase();
  for (const term of HIGH_INTERPRETATION_TERMS) {
    if (normalizedOutput.includes(term.toLowerCase()) && !normalizedSource.includes(term.toLowerCase())) {
      failRewrite('V1 final 输出包含材料未支持的高解释强度词。');
    }
  }
}

function buildCanonicalFinalReport(raw, finalAssessment, context) {
  const basic = isPlainObject(context.basicReport) ? context.basicReport : {};
  const advanced = isPlainObject(context.advancedReport) ? context.advancedReport : {};
  const inherited = Object.keys(advanced).length > 0 ? advanced : basic;
  const materialType = inherited.primary_material_type || inherited.material_type || context.materialType || 'synopsis';
  const nextTemplate = NEXT_STEP_TEMPLATES[finalAssessment.next_step.action];

  return {
    schema_version: REPORT_V1_SCHEMA_VERSION,
    stage: 'final',
    material_type: materialType,
    primary_material_type: materialType,
    secondary_material_types: arrayOrFallback(inherited.secondary_material_types, basic.secondary_material_types),
    is_mixed_material: Boolean(inherited.is_mixed_material || basic.is_mixed_material),
    material_components: arrayOrFallback(inherited.material_components, basic.material_components),
    format_hint: inherited.format_hint || basic.format_hint || 'unknown',
    maturity_level: raw.maturity_level,
    material_summary: inherited.material_summary || basic.material_summary || '已完成最终诊断归纳。',
    story_core: inherited.story_core || basic.story_core || '',
    strengths: arrayOrFallback(inherited.strengths, basic.strengths),
    main_problems: finalAssessment.core_blockers.map(item => ({
      title: BLOCKER_LABELS[item.blocker_type],
      severity: 'high',
      detail: `${item.problem_summary} 影响：${item.impact_summary}`
    })),
    priority_revisions: finalAssessment.core_blockers.map((item, index) => ({
      priority: index + 1,
      action: buildRevisionAction(item),
      reason: item.impact_summary
    })),
    next_step: {
      label: nextTemplate.label,
      detail: nextTemplate.detail,
      summary: nextTemplate.detail,
      action: finalAssessment.next_step.action,
      focus_blocker_ids: finalAssessment.next_step.focus_blocker_ids
    },
    conversion_advice: buildConversionAdvice(finalAssessment.next_step.action),
    rejection_reason: { code: 'OTHER', message: '' },
    final_assessment: finalAssessment,
    diagnostics: {
      stage: 'final',
      stageDecisionHints: {
        passed: true,
        reason: 'final assessment completed',
        recommendedAction: 'complete_final'
      },
      finalOutputSafety: {
        structureVersion: FINAL_STRUCTURE_VERSION,
        serverValidated: true,
        rewriteRisk: false
      }
    }
  };
}

function buildRevisionAction(blocker) {
  const directions = blocker.revision_direction.map(value => DIRECTION_LABELS[value]);
  const materials = blocker.missing_materials.map(value => MATERIAL_LABELS[value]);
  const parts = [`修改方向：${directions.join('、')}`];
  if (materials.length > 0) {
    parts.push(`需补材料：${materials.join('、')}`);
  }
  return parts.join('；');
}

function buildConversionAdvice(action) {
  if (action === 'internal_review') {
    return {
      status: 'ready',
      summary: '可进入内部评估，不代表项目入选或商业结果。',
      recommended_action: '按内部流程继续评估。'
    };
  }
  if (action === 'not_recommended') {
    return {
      status: 'not_recommended',
      summary: '当前不建议推进项目转化。',
      recommended_action: '先处理核心故事与材料问题。'
    };
  }
  return {
    status: 'possible_after_revision',
    summary: '完成核心修改或材料补充后再评估。',
    recommended_action: NEXT_STEP_TEMPLATES[action].detail
  };
}

function assertExactKeys(value, allowed, field) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter(key => !allowedSet.has(key));
  const missing = allowed.filter(key => !Object.prototype.hasOwnProperty.call(value, key));
  if (unknown.length > 0 || missing.length > 0) {
    failStructure(`${field} 字段不符合契约。`);
  }
}

function normalizeEnumArray(value, allowed, min, max, field) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    failStructure(`${field} 数量不符合要求。`);
  }
  const normalized = value.map(item => requireEnum(item, allowed, field));
  if (new Set(normalized).size !== normalized.length) {
    failStructure(`${field} 不得包含重复值。`);
  }
  return normalized;
}

function normalizeStringArray(value, { min, max, maxLength, field }) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    failStructure(`${field} 数量不符合要求。`);
  }
  return value.map(item => requireText(item, maxLength, field));
}

function requireEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    failStructure(`${field} 包含非法枚举。`);
  }
  return value;
}

function requireText(value, maxLength, field) {
  const text = optionalText(value, maxLength, field);
  if (!text) {
    failStructure(`${field} 不能为空。`);
  }
  return text;
}

function optionalText(value, maxLength, field) {
  if (typeof value !== 'string') {
    failStructure(`${field} 必须是字符串。`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    failStructure(`${field} 超过 ${maxLength} 字。`);
  }
  return text;
}

function sourceContainsEvidence(sourceText, quote) {
  const source = normalizeComparable(sourceText);
  const evidence = normalizeComparable(quote);
  return Boolean(evidence) && source.includes(evidence);
}

function normalizeComparable(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function assertPlainObject(value, message) {
  if (!isPlainObject(value)) {
    failStructure(message);
  }
}

function arrayOrFallback(primary, fallback) {
  if (Array.isArray(primary)) return primary;
  return Array.isArray(fallback) ? fallback : [];
}

function failStructure(message) {
  throw new ApiError(422, 'V1_FINAL_STRUCTURE_INVALID', message);
}

function failRewrite(message) {
  throw new ApiError(422, 'V1_FINAL_REWRITE_RISK', message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
