const STAGE_LABELS = Object.freeze({
  D0: '材料补充阶段',
  basic: '基础诊断',
  advanced: '进阶诊断',
  final: '最终诊断'
});

const DIRECTION_LABELS = Object.freeze({
  clarify_existing_causality: '明确既有事件的因果关系',
  clarify_rule_boundaries: '明确已有规则的边界',
  strengthen_existing_setup: '补足现有转折的前置铺垫',
  clarify_choice_pressure: '明确人物选择所承受的压力',
  clarify_character_response: '明确人物对既有事件的反应',
  clarify_consequences: '明确既有选择或事件的后果',
  clarify_structural_function: '明确现有段落或事件的结构功能',
  clarify_existing_motivation_evidence: '补足已有动机的材料依据',
  clarify_ending_state: '明确已有结尾方向的状态与后果',
  supply_missing_context: '补充完成判断所需的背景信息'
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

export function buildPublicDiagnosisResponse({ diagnosisId, result, inputMode, stats }) {
  const report = result?.reportV1 || {};
  const legacy = result?.finalReport || result?.basicReport || {};
  const stage = normalizeStage(result?.internalStage || report.stage);
  const assessment = report.final_assessment;

  return {
    ok: true,
    diagnosisId: diagnosisId || null,
    material: {
      inputMode: inputMode === 'file_upload' ? '文件上传' : '粘贴文本',
      charCount: Number(stats?.charCount || 0)
    },
    result: {
      currentStage: {
        label: STAGE_LABELS[stage],
        summary: buildStageSummary(stage, report, legacy)
      },
      coreIssues: assessment ? buildFinalIssues(assessment) : normalizeProblems(report.main_problems || legacy.problems),
      revisionDirections: assessment
        ? unique(assessment.core_blockers.flatMap(item => item.revision_direction || []).map(labelDirection))
        : normalizeTextList(report.priority_revisions || legacy.suggestions),
      missingMaterials: assessment
        ? unique(assessment.core_blockers.flatMap(item => item.missing_materials || []).map(labelMaterial))
        : buildMissingMaterials(report),
      nextStep: normalizeNextStep(report.next_step || legacy.nextStep || report.nextStep),
      strengths: normalizeTextList(report.strengths || legacy.strengths)
    }
  };
}

function buildFinalIssues(assessment) {
  return assessment.core_blockers.map(item => ({
    title: item.problem_summary,
    evidence: normalizeTextList(item.evidence_from_material),
    impact: item.impact_summary
  }));
}

function normalizeProblems(value) {
  return (Array.isArray(value) ? value : [value]).filter(Boolean).map(item => {
    if (typeof item === 'string') {
      return { title: item, evidence: [], impact: '' };
    }
    return {
      title: String(item.title || item.detail || '').trim(),
      evidence: normalizeTextList(item.evidence || item.evidence_from_material),
      impact: String(item.impact || item.reason || '').trim()
    };
  }).filter(item => item.title);
}

function buildStageSummary(stage, report, legacy) {
  if (stage === 'D0') {
    return report?.rejection_reason?.message || '当前材料信息不足，请先补充后再诊断。';
  }
  return String(report.material_summary || legacy.summary || '已完成当前阶段诊断。').trim();
}

function buildMissingMaterials(report) {
  if (report?.stage === 'D0') {
    return ['主角或核心主体', '目标或处境', '阻碍或压力', '关键事件', '结尾方向'];
  }
  return [];
}

function normalizeNextStep(value) {
  if (typeof value === 'string') {
    return { label: '下一步', detail: value.trim() };
  }
  if (!value || typeof value !== 'object') {
    return { label: '下一步', detail: '请根据当前诊断补充或修改材料后再评估。' };
  }
  return {
    label: String(value.label || '下一步').trim(),
    detail: String(value.detail || value.summary || value.action || '').trim()
  };
}

function normalizeTextList(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map(item => {
    if (typeof item === 'string') return item.trim();
    return String(item?.action || item?.detail || item?.title || '').trim();
  }).filter(Boolean);
}

function labelDirection(value) {
  return DIRECTION_LABELS[value] || '';
}

function labelMaterial(value) {
  return MATERIAL_LABELS[value] || '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeStage(value) {
  return Object.prototype.hasOwnProperty.call(STAGE_LABELS, value) ? value : 'basic';
}
