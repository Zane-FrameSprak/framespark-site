import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateV1StageReport } from '../src/services/aiClient.js';
import {
  V1_BASIC_PROMPT_VERSION,
  buildV1BasicDiagnosisMessages
} from '../src/prompts/v1BasicDiagnosis.js';

const STAGE = 'basic';
const realMode = process.argv.includes('--real');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(scriptDir, '../dev-samples/v1-staged-smoke-short-synopsis.txt');

async function main() {
  if (realMode) {
    const missing = getMissingRealGuards();
    if (missing.length > 0) {
      printLines({
        sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
        sampleChars: 0,
        mode: 'real',
        stage: STAGE,
        noAi: true,
        realCall: false,
        reportV1: false,
        diagnostics: false,
        missingGuard: missing.join(',')
      });
      process.exitCode = 1;
      return;
    }
  }

  const sampleText = await readSmokeSample();
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
    sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
    sampleChars: sampleText.length,
    mode: realMode ? 'real' : 'mock',
    stage: STAGE,
    noAi: !realMode,
    realCall: realMode,
    reportV1: Boolean(reportV1),
    diagnostics: Boolean(reportV1?.diagnostics)
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

async function readSmokeSample() {
  return readFile(samplePath, 'utf8');
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

function printLines(values) {
  Object.entries(values).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
}

main().catch((err) => {
  printLines({
    sampleSource: 'dev-samples/v1-staged-smoke-short-synopsis.txt',
    sampleChars: 0,
    mode: realMode ? 'real' : 'mock',
    stage: STAGE,
    noAi: !realMode,
    realCall: realMode,
    reportV1: false,
    diagnostics: false,
    errorCode: err?.code || err?.name || 'ERROR',
    errorMessage: String(err?.message || err).slice(0, 180)
  });
  process.exitCode = 1;
});
