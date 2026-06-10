import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateV1StageReport } from '../src/services/aiClient.js';
import {
  V1_BASIC_PROMPT_VERSION,
  buildV1BasicDiagnosisMessages
} from '../src/prompts/v1BasicDiagnosis.js';
import {
  V1_ADVANCED_PROMPT_VERSION,
  buildV1AdvancedDiagnosisMessages
} from '../src/prompts/v1AdvancedDiagnosis.js';
import {
  V1_FINAL_PROMPT_VERSION,
  buildV1FinalDiagnosisMessages
} from '../src/prompts/v1FinalDiagnosis.js';

const STAGE = 'basic';
const STAGES = ['basic', 'advanced', 'final'];
const realMode = process.argv.includes('--real');
const realStage = parseRealStage();
const realStageConfirmed = parseConfirmRealStage();
const smokeMinimal = process.argv.includes('--smoke-minimal');
const maxStage = parseMaxStage();
const scriptDir = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(scriptDir, '../dev-samples/v1-staged-smoke-short-synopsis.txt');

async function main() {
  const startedAt = Date.now();

  if (realStage && !realMode) {
    printGuardFailure({
      startedAt,
      mode: 'mock',
      realCall: false,
      noAi: true,
      error: '--real-stage requires --real.'
    });
    process.exitCode = 1;
    return;
  }

  if (realStage && !['advanced', 'final'].includes(realStage)) {
    printGuardFailure({
      startedAt,
      mode: 'real',
      realCall: false,
      noAi: true,
      error: 'Only --real-stage=advanced or --real-stage=final is supported in this smoke step.'
    });
    process.exitCode = 1;
    return;
  }

  if (realStage && realStageConfirmed !== realStage) {
    printGuardFailure({
      startedAt,
      mode: 'real',
      realCall: false,
      noAi: true,
      error: `--real-stage=${realStage} requires --confirm-real-stage=${realStage}.`
    });
    process.exitCode = 1;
    return;
  }

  if (realStage && !smokeMinimal) {
    printGuardFailure({
      startedAt,
      mode: 'real',
      realCall: false,
      noAi: true,
      error: `real ${realStage} smoke requires --smoke-minimal.`
    });
    process.exitCode = 1;
    return;
  }

  if (realMode && maxStage !== 'basic') {
    printGuardFailure({
      startedAt,
      mode: 'real',
      realCall: false,
      noAi: true,
      error: 'advanced/final real smoke requires a separate confirmation step.'
    });
    process.exitCode = 1;
    return;
  }

  if (realMode) {
    const missing = getMissingRealGuards();
    if (missing.length > 0) {
      printGuardFailure({
        startedAt,
        mode: 'real',
        realCall: false,
        noAi: true,
        missingGuard: missing.join(',')
      });
      process.exitCode = 1;
      return;
    }
  }

  const fullSampleText = await readSmokeSample();
  const sampleText = smokeMinimal ? buildMinimalSmokeText(fullSampleText) : fullSampleText;
  const payload = {
    text: sampleText,
    materialHint: {
      material_type: 'synopsis',
      primary_material_type: 'synopsis',
      secondary_material_types: [],
      is_mixed_material: false,
      material_components: []
    },
    stats: {
      charCount: sampleText.length
    },
    source: {
      filename: 'v1-staged-smoke-short-synopsis.txt'
    }
  };

  const results = await runStages(payload);
  const finalResult = results[results.length - 1];
  const reportV1 = finalResult?.reportV1;

  printLines({
    sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
    sampleChars: sampleText.length,
    mode: realMode ? 'real' : 'mock',
    maxStage,
    realStage: realStage || '',
    smokeMinimal,
    noAi: !realMode,
    realCall: realMode,
    stage: finalResult?.stage || STAGE,
    stageSequence: results.map((item) => item.stage).join('>'),
    stageReached: getStageReached(reportV1),
    decision: getDecision(reportV1),
    promptVersion: getPromptVersion(reportV1),
    model: getModelName(realMode),
    fallback: Boolean(reportV1?.diagnostics?.fallback),
    reportV1: Boolean(reportV1),
    diagnostics: Boolean(reportV1?.diagnostics),
    latencyMs: Date.now() - startedAt
  });
}

async function runStages(payload) {
  if (realMode && realStage === 'advanced') {
    const basicReport = smokeMinimal
      ? buildMinimalBasicReport()
      : await generateMockStageReport('basic', payload);
    const reportV1 = await generateRealAdvancedReport(payload, basicReport);
    return [{ stage: 'advanced', reportV1 }];
  }

  if (realMode && realStage === 'final') {
    const basicReport = buildMinimalBasicReport();
    const advancedReport = buildMinimalAdvancedReport();
    const reportV1 = await generateRealFinalReport(payload, basicReport, advancedReport);
    return [{ stage: 'final', reportV1 }];
  }

  const stageSequence = STAGES.slice(0, STAGES.indexOf(maxStage) + 1);
  const results = [];
  let basicReport = null;
  let advancedReport = null;

  for (const stage of stageSequence) {
    const stageInput = buildStageInput(stage, payload, basicReport, advancedReport);
    const reportV1 = await generateV1StageReport({
      stage,
      messages: stageInput.messages,
      promptVersion: stageInput.promptVersion,
      payload,
      metadata: payload.materialHint,
      ...(stage === 'final' ? {
        context: {
          sourceText: payload.text,
          basicReport,
          advancedReport
        }
      } : {}),
      ...(realMode ? {} : { requestFn: () => mockRequest(stage, payload) })
    });

    results.push({ stage, reportV1 });
    if (stage === 'basic') basicReport = reportV1;
    if (stage === 'advanced') advancedReport = reportV1;
  }

  return results;
}

async function generateMockStageReport(stage, payload) {
  const stageInput = buildStageInput(stage, payload, null, null);
  return generateV1StageReport({
    stage,
    messages: stageInput.messages,
    promptVersion: stageInput.promptVersion,
    payload,
    metadata: payload.materialHint,
    requestFn: () => mockRequest(stage)
  });
}

async function generateRealAdvancedReport(payload, basicReport) {
  const stageInput = buildStageInput('advanced', payload, basicReport, null);
  return generateV1StageReport({
    stage: 'advanced',
    messages: stageInput.messages,
    promptVersion: stageInput.promptVersion,
    payload,
    metadata: payload.materialHint
  });
}

async function generateRealFinalReport(payload, basicReport, advancedReport) {
  const stageInput = buildStageInput('final', payload, basicReport, advancedReport);
  return generateV1StageReport({
    stage: 'final',
    messages: stageInput.messages,
    promptVersion: stageInput.promptVersion,
    payload,
    metadata: payload.materialHint,
    context: {
      sourceText: payload.text,
      basicReport,
      advancedReport
    }
  });
}

function buildStageInput(stage, payload, basicReport, advancedReport) {
  if (stage === 'advanced') {
    return {
      promptVersion: V1_ADVANCED_PROMPT_VERSION,
      messages: buildV1AdvancedDiagnosisMessages({ ...payload, basicReport })
    };
  }
  if (stage === 'final') {
    return {
      promptVersion: V1_FINAL_PROMPT_VERSION,
      messages: buildV1FinalDiagnosisMessages({ ...payload, basicReport, advancedReport })
    };
  }

  return {
    promptVersion: V1_BASIC_PROMPT_VERSION,
    messages: buildV1BasicDiagnosisMessages(payload)
  };
}

function getMissingRealGuards() {
  const missing = [];
  if (!process.env.DEEPSEEK_API_KEY) missing.push('DEEPSEEK_API_KEY');
  if (process.env.ENABLE_DIAGNOSIS_V1 !== 'true') missing.push('ENABLE_DIAGNOSIS_V1=true');
  if (process.env.ENABLE_V1_STAGED_RUNNER !== 'true') missing.push('ENABLE_V1_STAGED_RUNNER=true');
  if (process.env.ENABLE_V1_REAL_PROMPTS !== 'true') missing.push('ENABLE_V1_REAL_PROMPTS=true');
  return missing;
}

async function readSmokeSample() {
  return readFile(samplePath, 'utf8');
}

function buildMinimalSmokeText(value) {
  const normalized = String(value || '').replace(/\s+/g, '');
  return normalized.slice(0, 420);
}

function buildMinimalBasicReport() {
  return {
    stage: 'basic',
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    maturity_level: 'B',
    material_summary: 'Smoke-only minimal basic summary.',
    story_core: {
      premise: 'A young archivist confronts a buried weather-station record.',
      protagonist: 'A young archivist.',
      conflict: 'A demolition deadline pressures him to decide whether to surface old evidence.',
      emotional_drive: 'He wants to understand his family loss without inventing blame.',
      theme_or_question: 'How should a town keep painful public memory?'
    },
    strengths: [{ title: 'Story chain exists', detail: 'There is a protagonist, pressure, investigation, and choice.' }],
    main_problems: [{ title: 'Needs sharper consequence', severity: 'medium', detail: 'The final public action needs clearer stakes.' }],
    priority_revisions: [{ priority: 1, action: 'Clarify the final choice.', reason: 'Advanced smoke needs a concise dependency.' }],
    next_step: { label: 'Enter advanced smoke', detail: 'Use this as a minimal dependency only.' },
    stageDecisionHints: {
      passed: true,
      reason: 'Minimal smoke dependency only.',
      recommendedAction: 'continue_advanced'
    }
  };
}

function buildMinimalAdvancedReport() {
  return {
    stage: 'advanced',
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    maturity_level: 'B',
    material_summary: 'Smoke-only minimal advanced summary.',
    story_core: {
      premise: 'A weather-station archive story with a clear public-memory conflict.',
      protagonist: 'A young archivist.',
      conflict: 'He must decide how to surface old evidence before demolition.',
      emotional_drive: 'He wants truth without false certainty.',
      theme_or_question: 'How can private grief become public responsibility?'
    },
    strengths: [{ title: 'Structure direction', detail: 'The material has setup, investigation, pressure, and public action.' }],
    main_problems: [{ title: 'Final stakes', severity: 'medium', detail: 'The final institutional consequence needs sharper definition.' }],
    priority_revisions: [{ priority: 1, action: 'Define the project file focus.', reason: 'Final smoke needs concise conversion context.' }],
    next_step: { label: 'Enter final smoke', detail: 'Use this as a minimal dependency only.' },
    conversion_advice: {
      status: 'not_applicable',
      summary: 'Advanced smoke dependency only.',
      recommended_action: ''
    },
    stageDecisionHints: {
      passed: true,
      reason: 'Minimal smoke dependency only.',
      recommendedAction: 'continue_final'
    }
  };
}

async function mockRequest(stage = 'basic', payload = {}) {
  if (stage === 'final') {
    const evidence = String(payload.text || '').replace(/\s+/g, '').slice(0, 24);
    return JSON.stringify({
      stage: 'final',
      maturity_level: 'B',
      final_assessment: {
        structure_version: 'v1-final-structure-1',
        core_blockers: [
          {
            id: 'mock-causal-gap',
            blocker_type: 'causal_gap',
            problem_summary: '关键选择与前序事件之间的因果依据仍不充分。',
            evidence_from_material: [evidence],
            impact_code: 'causal_clarity',
            impact_summary: '现有材料不足以稳定判断关键选择的成立过程。',
            revision_direction: ['clarify_existing_causality'],
            missing_materials: ['choice_basis', 'consequence']
          }
        ],
        next_step: {
          action: 'revise_then_reassess',
          focus_blocker_ids: ['mock-causal-gap']
        },
        forbidden_generation_check: {
          passed: true,
          risk_types: [],
          note: 'Mock output contains diagnostic fields only.'
        }
      }
    });
  }

  const promptVersion = getStagePromptVersion(stage);
  const maturityLevel = 'B';
  const conversionStatus = 'not_applicable';
  const recommendedAction = `continue_${stage === 'basic' ? 'advanced' : 'final'}`;

  return JSON.stringify({
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    secondary_material_types: [],
    is_mixed_material: false,
    material_components: [],
    format_hint: 'short_film_like',
    maturity_level: maturityLevel,
    material_summary: `Mock ${stage} smoke summary.`,
    story_core: {
      premise: 'A projectionist uses one last screening to face a shared memory.',
      protagonist: 'A young projectionist.',
      conflict: 'The final screening fails while old family history resurfaces.',
      emotional_drive: 'He wants to understand what his father tried to preserve.',
      theme_or_question: 'How does a fading place keep its stories alive?'
    },
    strengths: [
      {
        title: 'Clear dramatic situation',
        detail: 'The last screening gives the material a focused pressure point.'
      }
    ],
    main_problems: [
      {
        title: 'Development gap',
        severity: 'medium',
        detail: 'The central choice still needs sharper consequences.'
      }
    ],
    priority_revisions: [
      {
        priority: 1,
        action: 'Clarify the protagonist choice at the end.',
        reason: 'The basic story chain depends on that decision.'
      }
    ],
    next_step: {
      label: `Continue to ${stage} revision`,
      detail: 'Tighten the protagonist goal, obstacle, and final action.'
    },
    conversion_advice: {
      status: conversionStatus,
      summary: `${stage} stage does not make project conversion judgments.`,
      recommended_action: ''
    },
    rejection_reason: {
      code: 'OTHER',
      message: ''
    },
    diagnostics: {
      promptVersion,
      stageDecisionHints: {
        passed: true,
        reason: 'The sample has a protagonist, pressure, event chain, and change direction.',
        recommendedAction
      }
    }
  });
}

function printLines(values) {
  Object.entries(values).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
}

function getStageReached(reportV1) {
  return reportV1?.diagnostics?.stageReached || reportV1?.stage || STAGE;
}

function getDecision(reportV1) {
  return reportV1?.diagnostics?.decision
    || reportV1?.diagnostics?.stageDecisionHints?.recommendedAction
    || reportV1?.stageDecisionHints?.recommendedAction
    || '';
}

function getPromptVersion(reportV1) {
  return reportV1?.diagnostics?.promptVersion || getStagePromptVersion(reportV1?.stage || STAGE);
}

function getModelName(includeRealModel = true) {
  return includeRealModel ? (process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash') : 'mock';
}

function getStagePromptVersion(stage) {
  if (stage === 'advanced') return V1_ADVANCED_PROMPT_VERSION;
  if (stage === 'final') return V1_FINAL_PROMPT_VERSION;
  return V1_BASIC_PROMPT_VERSION;
}

function parseMaxStage() {
  const arg = process.argv.find((item) => item.startsWith('--max-stage='));
  const value = arg ? arg.split('=')[1] : 'basic';
  if (STAGES.includes(value)) {
    return value;
  }
  return 'basic';
}

function parseRealStage() {
  const arg = process.argv.find((item) => item.startsWith('--real-stage='));
  return arg ? arg.split('=')[1] : '';
}

function parseConfirmRealStage() {
  const arg = process.argv.find((item) => item.startsWith('--confirm-real-stage='));
  return arg ? arg.split('=')[1] : '';
}

function printGuardFailure({ startedAt, mode, realCall, noAi, error = '', missingGuard = '' }) {
  printLines({
    sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
    sampleChars: 0,
    mode,
    maxStage,
    realStage: realStage || '',
    smokeMinimal,
    stage: STAGE,
    stageSequence: '',
    noAi,
    realCall,
    stageReached: '',
    decision: '',
    promptVersion: '',
    model: getModelName(realCall),
    fallback: false,
    reportV1: false,
    diagnostics: false,
    latencyMs: Date.now() - startedAt,
    ...(missingGuard ? { missingGuard } : {}),
    ...(error ? { error } : {})
  });
}

main().catch((err) => {
  printLines({
    sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
    sampleChars: 0,
    mode: realMode ? 'real' : 'mock',
    maxStage,
    realStage: realStage || '',
    smokeMinimal,
    stage: STAGE,
    stageSequence: '',
    noAi: !realMode,
    realCall: realMode,
    stageReached: '',
    decision: '',
    promptVersion: V1_BASIC_PROMPT_VERSION,
    model: getModelName(realMode),
    fallback: false,
    reportV1: false,
    diagnostics: false,
    errorCode: err?.code || err?.name || 'ERROR',
    errorMessage: String(err?.message || err).slice(0, 180)
  });
  process.exitCode = 1;
});
