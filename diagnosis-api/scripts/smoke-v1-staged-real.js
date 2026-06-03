import { config } from '../src/config.js';
import { generateV1StageReport } from '../src/services/aiClient.js';
import {
  V1_BASIC_PROMPT_VERSION,
  buildV1BasicDiagnosisMessages
} from '../src/prompts/v1BasicDiagnosis.js';

const STAGE = 'basic';
const realMode = process.argv.includes('--real');

const sampleText = [
  '一个年轻的乡镇放映员在影院停业前的最后一晚，决定为镇上仅剩的几位观众放映一部没有片名的旧胶片。',
  '胶片中出现的街道和人物逐渐与现实重叠，他发现那是父亲年轻时没有完成的电影，也是小镇即将被遗忘的共同记忆。',
  '当设备开始故障，他必须在修好放映机、安抚观众和面对父亲旧事之间做出选择。',
  '最后，他把银幕转向影院外的空地，让路过的人都能看见那段影像，也第一次理解父亲为什么坚持留下这些故事。'
].join('');

async function main() {
  const startedAt = Date.now();

  if (realMode) {
    const missing = getMissingRealGuards();
    if (missing.length > 0) {
      printLines({
        mode: 'real',
        stage: STAGE,
        promptVersion: V1_BASIC_PROMPT_VERSION,
        model: getModelName(),
        latencyMs: Date.now() - startedAt,
        reportV1: false,
        diagnostics: false,
        fallback: false,
        noAi: true,
        realCall: false,
        error: `missing_guard:${missing.join(',')}`
      });
      process.exitCode = 1;
      return;
    }
  }

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
      filename: 'inline-smoke-synopsis'
    }
  };

  const messages = buildV1BasicDiagnosisMessages(payload);
  const reportV1 = await generateV1StageReport({
    stage: STAGE,
    messages,
    promptVersion: V1_BASIC_PROMPT_VERSION,
    payload,
    metadata: payload.materialHint,
    ...(realMode ? {} : { requestFn: mockRequest })
  });

  printLines({
    mode: realMode ? 'real' : 'mock',
    stage: STAGE,
    promptVersion: V1_BASIC_PROMPT_VERSION,
    model: realMode ? getModelName() : 'mock',
    latencyMs: Date.now() - startedAt,
    reportV1: Boolean(reportV1),
    diagnostics: Boolean(reportV1?.diagnostics),
    fallback: Boolean(reportV1?.diagnostics?.fallback),
    noAi: !realMode,
    realCall: realMode
  });
}

function getMissingRealGuards() {
  const missing = [];
  if (!process.env.DEEPSEEK_API_KEY) missing.push('DEEPSEEK_API_KEY');
  if (process.env.ENABLE_DIAGNOSIS_V1 !== 'true') missing.push('ENABLE_DIAGNOSIS_V1=true');
  if (process.env.ENABLE_V1_STAGED_RUNNER !== 'true') missing.push('ENABLE_V1_STAGED_RUNNER=true');
  if (process.env.ENABLE_V1_REAL_PROMPTS !== 'true') missing.push('ENABLE_V1_REAL_PROMPTS=true');
  return missing;
}

async function mockRequest() {
  return JSON.stringify({
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    secondary_material_types: [],
    is_mixed_material: false,
    material_components: [],
    format_hint: 'short_film_like',
    maturity_level: 'B',
    material_summary: 'Mock basic smoke summary.',
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
      label: 'Continue to basic revision',
      detail: 'Tighten the protagonist goal, obstacle, and final action.'
    },
    conversion_advice: {
      status: 'not_applicable',
      summary: 'Basic stage does not make project conversion judgments.',
      recommended_action: ''
    },
    rejection_reason: {
      code: 'OTHER',
      message: ''
    },
    diagnostics: {
      promptVersion: V1_BASIC_PROMPT_VERSION,
      stageDecisionHints: {
        passed: true,
        reason: 'The sample has a protagonist, pressure, event chain, and change direction.',
        recommendedAction: 'continue_advanced'
      }
    }
  });
}

function getModelName() {
  return process.env.DEEPSEEK_MODEL || config.deepseekModel || 'unknown';
}

function printLines(values) {
  Object.entries(values).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
}

main().catch((err) => {
  printLines({
    mode: realMode ? 'real' : 'mock',
    stage: STAGE,
    promptVersion: V1_BASIC_PROMPT_VERSION,
    model: realMode ? getModelName() : 'mock',
    reportV1: false,
    diagnostics: false,
    fallback: false,
    noAi: !realMode,
    realCall: realMode,
    errorCode: err?.code || err?.name || 'ERROR',
    errorMessage: String(err?.message || err).slice(0, 180)
  });
  process.exitCode = 1;
});
