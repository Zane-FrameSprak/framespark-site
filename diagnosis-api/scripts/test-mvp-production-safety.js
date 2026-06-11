import fs from 'fs/promises';
import path from 'path';
import { config } from '../src/config.js';
import { createBetaIdentityGuard, createOriginGuard, requireBetaIdentity } from '../src/middleware/betaAccess.js';
import { validateScriptText } from '../src/services/guard.js';
import { routeMaterial } from '../src/services/materialRouter.js';
import { runDiagnosisPipelineWithEngines } from '../src/services/diagnosisPipeline.js';
import { parseUploadedFile } from '../src/services/fileParser.js';
import { logDiagnosisResult } from '../src/services/diagnosisLogger.js';
import { createProviderCallBudget } from '../src/services/providerCallBudget.js';
import { buildPublicDiagnosisResponse } from '../src/services/publicDiagnosisResponse.js';
import { getPublicError } from '../src/services/publicErrors.js';
import { getProductionReadiness } from '../src/services/productionReadiness.js';
import { ApiError } from '../src/utils/errors.js';

const cases = [
  ['public response hides internal fields', testPublicResponse],
  ['production readiness requires secure V1 config', testProductionReadiness],
  ['provider budget caps total calls and repair count', testProviderBudget],
  ['fail-closed V1 errors do not return legacy reports', testFailClosedPipeline],
  ['TXT parser rejects MIME mismatch and binary content', testStrictTxtParser],
  ['diagnosis metadata log does not persist full report or filename', testMetadataRedaction],
  ['beta identity middleware allows local dev without exposing credentials', testBetaIdentityDevelopment],
  ['production Beta identity and origin guards reject untrusted requests', testBetaAccessGuards],
  ['V1 D0 path keeps low-information material out of hard rejection', testD0Admission],
  ['feedback validation errors remain controlled public 400 responses', testFeedbackPublicError]
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

if (failed) process.exitCode = 1;
else console.log(`\nMVP production safety tests passed: ${cases.length}/${cases.length}\n`);

function testPublicResponse() {
  const response = buildPublicDiagnosisResponse({
    diagnosisId: 'diag-test',
    inputMode: 'pasted_text',
    stats: { charCount: 900 },
    result: {
      internalStage: 'final',
      diagnosisEngine: 'v1-staged',
      diagnostics: { stageReached: 'final', promptVersion: 'secret-version', fallback: false },
      reportV1: {
        stage: 'final',
        material_summary: '材料摘要。',
        strengths: ['已有明确人物行动。'],
        final_assessment: {
          core_blockers: [{
            problem_summary: '关键转折缺少铺垫。',
            evidence_from_material: ['他突然烧掉信件'],
            impact_summary: '人物选择显得突兀。',
            revision_direction: ['strengthen_existing_setup'],
            missing_materials: ['prior_setup']
          }],
          next_step: { action: 'revise_then_reassess', focus_blocker_ids: ['b1'] }
        },
        next_step: { label: '修改后再评估', detail: '先处理核心阻塞问题。' }
      },
      finalReport: { summary: 'legacy', problems: [], suggestions: [], nextStep: 'legacy next' }
    }
  });

  assertEqual(response.result.currentStage.label, '最终诊断', 'stage label');
  assertEqual(response.result.coreIssues[0].impact, '人物选择显得突兀。', 'impact');
  const serialized = JSON.stringify(response);
  for (const forbidden of ['stageReached', 'promptVersion', 'diagnosisEngine', 'reportV1', 'fallback']) {
    assertEqual(serialized.includes(forbidden), false, `public response contains ${forbidden}`);
  }
}

function testProductionReadiness() {
  const ready = getProductionReadiness({
    deepseekApiKey: 'configured',
    enableDiagnosisV1: true,
    enableV1StagedRunner: true,
    enableV1RealPrompts: true,
    enableDevTools: false,
    failClosedOnV1Error: true,
    requireBetaIdentity: true,
    host: '127.0.0.1',
    port: 8788,
    dataDir: '/var/lib/framespark-diagnosis',
    trustedProxy: 'loopback',
    maxUploadBytes: 5 * 1024 * 1024,
    maxTextChars: 20000,
    metadataRetentionDays: 30,
    reviewRetentionDays: 14,
    requestTimeoutMs: 210000,
    providerCallLimitPerDiagnosis: 5,
    rateLimits: { concurrencyLimit: 2 },
    allowedOrigins: ['https://framespark.cn']
  });
  assertEqual(ready.ok, true, 'ready config');

  const unsafe = getProductionReadiness({
    deepseekApiKey: '',
    enableDiagnosisV1: false,
    enableV1StagedRunner: false,
    enableV1RealPrompts: false,
    enableDevTools: true,
    failClosedOnV1Error: false,
    requireBetaIdentity: false,
    host: '0.0.0.0',
    port: 8787,
    dataDir: '/tmp/diagnosis',
    allowedOrigins: []
  });
  assertEqual(unsafe.ok, false, 'unsafe config');
  assertTruthy(unsafe.errors.includes('ENABLE_DEV_TOOLS_MUST_BE_FALSE'), 'dev tools check');
}

function testProviderBudget() {
  const budget = createProviderCallBudget({ maxCalls: 2, maxGeneralRepairs: 1 });
  budget.consumeCall();
  budget.consumeCall();
  assertEqual(budget.consumeGeneralRepair(), true, 'first repair');
  assertEqual(budget.consumeGeneralRepair(), false, 'second repair');
  assertThrowsCode(() => budget.consumeCall(), 'AI_CALL_BUDGET_EXCEEDED');
}

async function testFailClosedPipeline() {
  let legacyCalled = false;
  let error;
  try {
    await runDiagnosisPipelineWithEngines(makePayload(), {
      generateBasic: async () => {
        legacyCalled = true;
        return makeLegacyReport();
      },
      generateAdvanced: async () => makeLegacyReport(),
      generateV1: async () => { throw new Error('not used'); },
      runStagedV1: async () => {
        throw new ApiError(422, 'V1_FINAL_OUTPUT_UNSAFE', 'unsafe');
      }
    }, {
      enableDiagnosisV1: true,
      enableV1StagedRunner: true,
      failClosedOnV1Error: true
    });
  } catch (caught) {
    error = caught;
  }
  assertEqual(error?.code, 'V1_DIAGNOSIS_FAILED', 'fail-closed code');
  assertEqual(legacyCalled, false, 'legacy fallback called');
}

async function testStrictTxtParser() {
  const parsed = await parseUploadedFile({
    originalname: 'story.txt',
    mimetype: 'text/plain',
    buffer: Buffer.from('一个虚构故事。'.repeat(20), 'utf8')
  });
  assertEqual(parsed.source.type, 'txt', 'txt type');
  assertEqual(parsed.source.filename, undefined, 'filename retained');

  await assertRejectsCode(() => parseUploadedFile({
    originalname: 'story.txt',
    mimetype: 'application/pdf',
    buffer: Buffer.from('fake')
  }), 'FILE_TYPE_MISMATCH');

  await assertRejectsCode(() => parseUploadedFile({
    originalname: 'story.txt',
    mimetype: 'text/plain',
    buffer: Buffer.from([0, 1, 2, 3, 4])
  }), 'FILE_CONTENT_INVALID');
}

async function testMetadataRedaction() {
  const entry = await logDiagnosisResult({
    mode: 'mock',
    betaIdentity: 'reviewer@example.test',
    materialType: 'other',
    materialRouting: { materialForm: 'synopsis', targetFormat: 'short' },
    inputMode: 'file_upload',
    parsed: { source: { filename: 'private-story.txt', type: 'txt' }, text: 'PRIVATE_MATERIAL_TEXT' },
    stats: { charCount: 900 },
    result: {
      internalStage: 'basic',
      diagnosisEngine: 'v1-staged',
      diagnostics: { decision: 'stop_basic', providerCalls: 1 },
      reportV1: { material_summary: 'PRIVATE_REPORT_TEXT' },
      finalReport: makeLegacyReport()
    },
    reviewConsent: false
  });
  assertTruthy(entry?.id, 'metadata entry');
  const file = path.join(
    config.dataDir,
    'diagnosis',
    'metadata',
    'by-date',
    entry.createdAt.slice(0, 10),
    `${entry.id}.json`
  );
  const saved = await fs.readFile(file, 'utf8');
  for (const forbidden of ['PRIVATE_MATERIAL_TEXT', 'PRIVATE_REPORT_TEXT', 'private-story.txt', 'reviewer@example.test']) {
    assertEqual(saved.includes(forbidden), false, `metadata contains ${forbidden}`);
  }
}

function testBetaIdentityDevelopment() {
  const request = { betaIdentity: '', get() { return ''; } };
  let nextCalled = false;
  requireBetaIdentity(request, {}, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'next called');
  assertEqual(request.betaIdentity, 'local-development', 'local identity');
}

function testBetaAccessGuards() {
  const guard = createBetaIdentityGuard(true);
  const denied = createResponseRecorder();
  guard({ get() { return ''; } }, denied.response, () => denied.markNext());
  assertEqual(denied.status, 401, 'missing identity status');
  assertEqual(denied.nextCalled, false, 'missing identity next');

  const request = { get() { return 'invited-reviewer'; } };
  let nextCalled = false;
  guard(request, createResponseRecorder().response, () => { nextCalled = true; });
  assertEqual(nextCalled, true, 'valid identity next');
  assertEqual(request.betaIdentity, 'invited-reviewer', 'trusted identity');

  const originGuard = createOriginGuard(['https://framespark.cn']);
  const blocked = createResponseRecorder();
  originGuard({ get() { return 'https://example.invalid'; } }, blocked.response, () => blocked.markNext());
  assertEqual(blocked.status, 403, 'blocked origin status');
}

async function testD0Admission() {
  let classifierCalled = false;
  const routing = await routeMaterial({
    userSelectedType: 'other',
    text: '产品价格表和服务条款。',
    useAiClassification: false,
    classifier: async () => {
      classifierCalled = true;
      return {};
    }
  });
  assertEqual(routing.materialForm, 'reject', 'local non-story classification');
  assertEqual(classifierCalled, false, 'classifier called');
  const result = validateScriptText('产品价格表和服务条款。', routing, { allowD0: true });
  assertTruthy(result.stats.charCount > 0, 'D0 text admitted');
}

function testFeedbackPublicError() {
  const result = getPublicError(new ApiError(400, 'FEEDBACK_EMPTY', 'internal text'));
  assertEqual(result.status, 400, 'feedback status');
  assertEqual(result.code, 'FEEDBACK_EMPTY', 'feedback code');
  assertEqual(result.message.includes('internal text'), false, 'internal feedback message exposed');
}

function createResponseRecorder() {
  const recorder = {
    status: null,
    body: null,
    nextCalled: false,
    markNext() { recorder.nextCalled = true; }
  };
  recorder.response = {
    status(value) {
      recorder.status = value;
      return this;
    },
    json(value) {
      recorder.body = value;
      return this;
    }
  };
  return recorder;
}

function makePayload() {
  return {
    text: '一个青年导演回到家乡寻找旧胶片。'.repeat(40),
    materialType: 'other',
    materialForm: 'synopsis',
    materialRouting: { materialForm: 'synopsis', effectiveDiagnosisType: 'other' }
  };
}

function makeLegacyReport() {
  return {
    summary: 'legacy',
    core: 'legacy',
    strengths: [],
    problems: [],
    suggestions: [],
    nextStep: 'legacy'
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertTruthy(value, label) {
  if (!value) throw new Error(`${label}: expected truthy value`);
}

function assertThrowsCode(fn, code) {
  let error;
  try { fn(); } catch (caught) { error = caught; }
  assertEqual(error?.code, code, 'error code');
}

async function assertRejectsCode(fn, code) {
  let error;
  try { await fn(); } catch (caught) { error = caught; }
  assertEqual(error?.code, code, 'error code');
}
