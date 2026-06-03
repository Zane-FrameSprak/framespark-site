import { evaluateV1Gatekeeper } from './v1Gatekeeper.js';
import { decideV1Stage } from './v1StageDecision.js';
import { REPORT_V1_SCHEMA_VERSION } from './reportV1Schema.js';
import { config } from '../config.js';
import { buildV1BasicDiagnosisMessages, V1_BASIC_PROMPT_VERSION } from '../prompts/v1BasicDiagnosis.js';
import { buildV1AdvancedDiagnosisMessages, V1_ADVANCED_PROMPT_VERSION } from '../prompts/v1AdvancedDiagnosis.js';
import { buildV1FinalDiagnosisMessages, V1_FINAL_PROMPT_VERSION } from '../prompts/v1FinalDiagnosis.js';
import { ApiError } from '../utils/errors.js';

export async function runV1StagedDiagnosis(input = {}, deps = {}) {
  const realPromptsEnabled = resolveRealPromptsEnabled(input, deps);

  if (!realPromptsEnabled) {
    return runV1StagedDiagnosisMock(input, { realPromptsEnabled: false });
  }

  if (typeof deps.generateV1StageReport !== 'function') {
    throw new ApiError(500, 'V1_REAL_PROMPTS_NOT_CONFIGURED', 'V1 staged real prompts require an injected aiClient.');
  }

  return runV1StagedDiagnosisWithAi(input, deps);
}

export function runV1StagedDiagnosisMock(input = {}, options = {}) {
  const gate = evaluateV1Gatekeeper(input);

  if (gate.decision === 'stop_d0') {
    return buildRunnerResult({
      stageReached: 'D0',
      decision: 'stop_d0',
      stopReason: gate.reportV1.rejection_reason.message,
      reportV1: gate.reportV1,
      decisions: [gate],
      usedMockRunner: true,
      noAi: true,
      realPromptsEnabled: Boolean(options.realPromptsEnabled)
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
      decisions,
      usedMockRunner: true,
      noAi: true,
      realPromptsEnabled: Boolean(options.realPromptsEnabled)
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
      decisions,
      usedMockRunner: true,
      noAi: true,
      realPromptsEnabled: Boolean(options.realPromptsEnabled)
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
    decisions,
    usedMockRunner: true,
    noAi: true,
    realPromptsEnabled: Boolean(options.realPromptsEnabled)
  });
}

async function runV1StagedDiagnosisWithAi(input, deps) {
  const gate = evaluateV1Gatekeeper(input);

  if (gate.decision === 'stop_d0') {
    return buildRunnerResult({
      stageReached: 'D0',
      decision: 'stop_d0',
      stopReason: gate.reportV1.rejection_reason.message,
      reportV1: gate.reportV1,
      decisions: [gate],
      usedMockRunner: false,
      noAi: true,
      realPromptsEnabled: true
    });
  }

  const decisions = [gate];
  const materialHint = normalizeMaterialHint(input.materialHint || input.metadata || {});

  const basicReport = await deps.generateV1StageReport({
    stage: 'basic',
    promptVersion: V1_BASIC_PROMPT_VERSION,
    messages: buildV1BasicDiagnosisMessages({ ...input, materialHint }),
    payload: input,
    metadata: materialHint
  });
  const basicDecision = decideV1Stage(extractDecisionInput('basic', basicReport));
  decisions.push(basicDecision);

  if (basicDecision.action === 'stop_basic') {
    return buildRunnerResult({
      stageReached: 'basic',
      decision: basicDecision.action,
      stopReason: basicDecision.reason,
      reportV1: basicReport,
      decisions,
      usedMockRunner: false,
      noAi: false,
      realPromptsEnabled: true,
      promptVersion: V1_BASIC_PROMPT_VERSION
    });
  }

  const advancedReport = await deps.generateV1StageReport({
    stage: 'advanced',
    promptVersion: V1_ADVANCED_PROMPT_VERSION,
    messages: buildV1AdvancedDiagnosisMessages({ ...input, materialHint, basicReport }),
    payload: input,
    metadata: materialHint
  });
  const advancedDecision = decideV1Stage(extractDecisionInput('advanced', advancedReport));
  decisions.push(advancedDecision);

  if (advancedDecision.action !== 'continue_final') {
    return buildRunnerResult({
      stageReached: 'advanced',
      decision: advancedDecision.action,
      stopReason: advancedDecision.reason,
      reportV1: advancedReport,
      decisions,
      usedMockRunner: false,
      noAi: false,
      realPromptsEnabled: true,
      promptVersion: V1_ADVANCED_PROMPT_VERSION
    });
  }

  const finalReport = await deps.generateV1StageReport({
    stage: 'final',
    promptVersion: V1_FINAL_PROMPT_VERSION,
    messages: buildV1FinalDiagnosisMessages({ ...input, materialHint, basicReport, advancedReport }),
    payload: input,
    metadata: materialHint
  });
  const finalDecision = decideV1Stage(extractDecisionInput('final', finalReport));
  decisions.push(finalDecision);

  return buildRunnerResult({
    stageReached: 'final',
    decision: finalDecision.action,
    stopReason: finalDecision.reason,
    reportV1: finalReport,
    decisions,
    usedMockRunner: false,
    noAi: false,
    realPromptsEnabled: true,
    promptVersion: V1_FINAL_PROMPT_VERSION
  });
}

function buildRunnerResult({
  stageReached,
  decision,
  stopReason,
  reportV1,
  decisions,
  usedMockRunner,
  noAi,
  realPromptsEnabled,
  promptVersion = ''
}) {
  return {
    ok: true,
    reportV1,
    diagnostics: {
      source: 'v1-stage-runner',
      stageReached,
      decision,
      stopReason,
      usedMockRunner,
      noAi,
      realPromptsEnabled,
      promptVersion,
      decisions: decisions.map((item) => ({
        stage: item.stage || item.currentStage,
        decision: item.decision || item.action,
        nextStage: item.nextStage || null
      }))
    }
  };
}

function extractDecisionInput(stage, reportV1) {
  const hints = reportV1?.diagnostics?.stageDecisionHints || reportV1?.stageDecisionHints || {};

  return {
    stage,
    passed: typeof hints.passed === 'boolean' ? hints.passed : stage === 'final',
    flags: {
      storyLikely: hints.passed === true && stage === 'basic',
      storyStands: hints.passed === true && stage === 'advanced'
    }
  };
}

function resolveRealPromptsEnabled(input, deps) {
  if (typeof deps.enableV1RealPrompts === 'boolean') {
    return deps.enableV1RealPrompts;
  }
  if (typeof input.enableV1RealPrompts === 'boolean') {
    return input.enableV1RealPrompts;
  }
  return config.enableV1RealPrompts;
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
