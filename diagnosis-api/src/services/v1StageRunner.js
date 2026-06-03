import { evaluateV1Gatekeeper } from './v1Gatekeeper.js';
import { decideV1Stage } from './v1StageDecision.js';
import { REPORT_V1_SCHEMA_VERSION } from './reportV1Schema.js';

export function runV1StagedDiagnosisMock(input = {}) {
  const gate = evaluateV1Gatekeeper(input);

  if (gate.decision === 'stop_d0') {
    return buildRunnerResult({
      stageReached: 'D0',
      decision: 'stop_d0',
      stopReason: gate.reportV1.rejection_reason.message,
      reportV1: gate.reportV1,
      decisions: [gate]
    });
  }

  const requestedOutcome = normalizeOutcome(input.mockOutcome);
  const materialHint = normalizeMaterialHint(input.materialHint || input.metadata || {});
  const decisions = [gate];

  const basicDecision = decideV1Stage({
    stage: 'basic',
    passed: requestedOutcome.basicPassed,
    score: requestedOutcome.basicScore,
    flags: { storyLikely: requestedOutcome.basicPassed }
  });
  decisions.push(basicDecision);

  if (basicDecision.action === 'stop_basic') {
    return buildRunnerResult({
      stageReached: 'basic',
      decision: basicDecision.action,
      stopReason: basicDecision.reason,
      reportV1: buildStageReport({
        stage: 'basic',
        maturityLevel: 'C',
        materialHint,
        summary: '材料具备部分故事信息，但基础故事链条尚未成立。',
        nextStep: '先补清主角、目标、阻碍和结果。'
      }),
      decisions
    });
  }

  const advancedDecision = decideV1Stage({
    stage: 'advanced',
    passed: requestedOutcome.advancedPassed,
    score: requestedOutcome.advancedScore,
    flags: { storyStands: requestedOutcome.advancedPassed }
  });
  decisions.push(advancedDecision);

  if (advancedDecision.action !== 'continue_final') {
    return buildRunnerResult({
      stageReached: 'advanced',
      decision: advancedDecision.action,
      stopReason: advancedDecision.reason,
      reportV1: buildStageReport({
        stage: 'advanced',
        maturityLevel: 'B',
        materialHint,
        summary: '材料已经像一个故事，但结构、人物推进或类型完成度仍需加强。',
        nextStep: '优先整理结构转折、人物选择和关键场面。'
      }),
      decisions
    });
  }

  const finalDecision = decideV1Stage({ stage: 'final', passed: true });
  decisions.push(finalDecision);

  return buildRunnerResult({
    stageReached: 'final',
    decision: finalDecision.action,
    stopReason: finalDecision.reason,
    reportV1: buildStageReport({
      stage: 'final',
      maturityLevel: requestedOutcome.finalMaturityLevel,
      materialHint,
      summary: '材料已完成 staged runner 的终极阶段模拟。',
      nextStep: '可考虑整理为项目档案，并进入帧火花内部进一步评估。'
    }),
    decisions
  });
}

function buildRunnerResult({ stageReached, decision, stopReason, reportV1, decisions }) {
  return {
    ok: true,
    reportV1,
    diagnostics: {
      source: 'v1-stage-runner',
      stageReached,
      decision,
      stopReason,
      usedMockRunner: true,
      noAi: true,
      decisions: decisions.map((item) => ({
        stage: item.stage || item.currentStage,
        decision: item.decision || item.action,
        nextStage: item.nextStage || null
      }))
    }
  };
}

function buildStageReport({ stage, maturityLevel, materialHint, summary, nextStep }) {
  const materialType = materialHint.primary_material_type || materialHint.material_type || 'synopsis';

  return {
    schemaVersion: REPORT_V1_SCHEMA_VERSION,
    stage,
    material_type: materialType,
    primary_material_type: materialType,
    secondary_material_types: Array.isArray(materialHint.secondary_material_types)
      ? materialHint.secondary_material_types
      : [],
    is_mixed_material: Boolean(materialHint.is_mixed_material),
    material_components: Array.isArray(materialHint.material_components)
      ? materialHint.material_components
      : [],
    maturity_level: maturityLevel,
    material_summary: summary,
    story_core: 'Mock runner placeholder for staged V1 flow.',
    strengths: ['具备进入当前阶段评估的基础信息。'],
    main_problems: ['此为无 AI 骨架输出，不代表真实诊断结论。'],
    priority_revisions: [nextStep],
    next_step: nextStep,
    conversion_advice: {
      status: stage === 'final' ? 'possible_after_revision' : 'not_applicable',
      message: stage === 'final' ? '可考虑整理为项目档案，等待内部进一步评估。' : '当前阶段不做项目转化判断。'
    },
    rejection_reason: null
  };
}

function normalizeOutcome(value) {
  const outcome = value && typeof value === 'object' ? value : {};

  return {
    basicPassed: outcome.basicPassed !== false,
    basicScore: Number.isFinite(outcome.basicScore) ? outcome.basicScore : null,
    advancedPassed: outcome.advancedPassed !== false,
    advancedScore: Number.isFinite(outcome.advancedScore) ? outcome.advancedScore : null,
    finalMaturityLevel: typeof outcome.finalMaturityLevel === 'string' ? outcome.finalMaturityLevel : 'A'
  };
}

function normalizeMaterialHint(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return {
    material_type: normalizeString(value.material_type || value.materialType),
    primary_material_type: normalizeString(value.primary_material_type || value.primaryMaterialType),
    secondary_material_types: Array.isArray(value.secondary_material_types) ? value.secondary_material_types : [],
    is_mixed_material: Boolean(value.is_mixed_material),
    material_components: Array.isArray(value.material_components) ? value.material_components : []
  };
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

