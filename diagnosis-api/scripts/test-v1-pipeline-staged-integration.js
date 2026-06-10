/**
 * V1 staged runner pipeline integration checks.
 *
 * These tests do not call real AI. They inject stub engines into
 * diagnosisPipeline and verify the staged runner switch remains gated.
 */

import { runDiagnosisPipelineWithEngines } from '../src/services/diagnosisPipeline.js';
import { ApiError } from '../src/utils/errors.js';

const cases = [
  {
    name: 'V1=false => staged runner is not used',
    async run() {
      let stagedCalled = false;
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateBasic: async () => makeLegacyReport(),
        generateAdvanced: async () => makeLegacyReport({ summary: 'advanced should not run' }),
        generateV1: async () => {
          throw new Error('V1 should not run');
        },
        runStagedV1: async () => {
          stagedCalled = true;
          return makeStagedResult();
        }
      }, {
        enableDiagnosisV1: false,
        enableV1StagedRunner: true
      });

      assertEqual(stagedCalled, false, 'staged called');
      assertEqual(result.finalReport.summary, '旧版兼容报告。', 'legacy summary');
      assertEqual(result.reportV1, undefined, 'reportV1');
    }
  },
  {
    name: 'V1=true + staged=false => existing one-shot V1 path is used',
    async run() {
      let stagedCalled = false;
      let v1Called = false;
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateBasic: async () => {
          throw new Error('legacy should not run');
        },
        generateAdvanced: async () => {
          throw new Error('advanced should not run');
        },
        generateV1: async () => {
          v1Called = true;
          return makeReportV1();
        },
        runStagedV1: async () => {
          stagedCalled = true;
          return makeStagedResult();
        }
      }, {
        enableDiagnosisV1: true,
        enableV1StagedRunner: false
      });

      assertEqual(v1Called, true, 'v1 called');
      assertEqual(stagedCalled, false, 'staged called');
      assertEqual(result.diagnosisEngine, 'v1', 'diagnosisEngine');
      assertTruthy(result.reportV1, 'reportV1');
      assertTruthy(result.basicReport, 'basicReport');
      assertTruthy(result.finalReport, 'finalReport');
    }
  },
  {
    name: 'V1=true + staged=true => staged runner branch is used',
    async run() {
      let stagedCalled = false;
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateBasic: async () => {
          throw new Error('legacy should not run');
        },
        generateAdvanced: async () => {
          throw new Error('advanced should not run');
        },
        generateV1: async () => {
          throw new Error('one-shot V1 should not run');
        },
        runStagedV1: async () => {
          stagedCalled = true;
          return makeStagedResult();
        }
      }, {
        enableDiagnosisV1: true,
        enableV1StagedRunner: true
      });

      assertEqual(stagedCalled, true, 'staged called');
      assertEqual(result.diagnosisEngine, 'v1-staged', 'diagnosisEngine');
      assertEqual(result.reportV1.stage, 'basic', 'stage');
      assertEqual(result.diagnostics.usedMockRunner, true, 'mock flag');
      assertTruthy(result.basicReport, 'basicReport');
      assertTruthy(result.finalReport, 'finalReport');
    }
  },
  {
    name: 'staged runner failure falls back to legacy',
    async run() {
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateBasic: async () => makeLegacyReport({ summary: '旧链路兜底报告。' }),
        generateAdvanced: async () => makeLegacyReport({ summary: 'advanced should not run' }),
        generateV1: async () => {
          throw new Error('one-shot V1 should not run');
        },
        runStagedV1: async () => {
          throw new ApiError(422, 'V1_FINAL_OUTPUT_UNSAFE', 'unsafe final output');
        }
      }, {
        enableDiagnosisV1: true,
        enableV1StagedRunner: true
      });

      assertEqual(result.diagnosisEngine, 'legacy-fallback', 'diagnosisEngine');
      assertEqual(result.finalReport.summary, '旧链路兜底报告。', 'legacy summary');
      assertEqual(result.reportV1.diagnostics.fallback, true, 'fallback flag');
      assertEqual(result.reportV1.diagnostics.fallback_reason, 'V1_FINAL_OUTPUT_UNSAFE', 'fallback reason');
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    await testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`\nV1 staged pipeline integration tests passed: ${cases.length}/${cases.length}\n`);
}

function makePayload(overrides = {}) {
  return {
    text: '一个青年导演回到家乡，寻找母亲年轻时留下的一卷旧胶片。',
    materialType: 'other',
    materialForm: 'synopsis',
    materialRouting: {
      targetFormat: 'unknown',
      materialForm: 'synopsis',
      effectiveDiagnosisType: 'other'
    },
    inputMode: 'pasted_text',
    stats: { charCount: 1200, lineCount: 10 },
    source: { filename: 'test', type: 'pasted_text' },
    ...overrides
  };
}

function makeLegacyReport(overrides = {}) {
  return {
    summary: '旧版兼容报告。',
    core: '旧版核心判断。',
    strengths: ['旧版亮点'],
    problems: ['旧版问题'],
    suggestions: ['旧版建议'],
    nextStep: '建议继续打磨：先补强材料。',
    ...overrides
  };
}

function makeReportV1(overrides = {}) {
  return {
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    maturity_level: 'B',
    material_summary: '一份故事梗概。',
    story_core: '主角寻找旧胶片背后的秘密。',
    strengths: ['有明确寻找动作'],
    main_problems: ['结尾选择仍需明确'],
    priority_revisions: ['补强结尾'],
    next_step: '继续完善故事梗概。',
    conversion_advice: {
      status: 'not_applicable',
      message: '当前阶段不做项目转化判断。'
    },
    rejection_reason: null,
    ...overrides
  };
}

function makeStagedResult() {
  return {
    ok: true,
    reportV1: {
      ...makeReportV1(),
      stage: 'basic',
      material_summary: 'staged runner basic report',
      conversion_advice: {
        status: 'not_applicable',
        message: '当前阶段不做项目转化判断。'
      }
    },
    diagnostics: {
      source: 'v1-stage-runner',
      stageReached: 'basic',
      decision: 'stop_basic',
      stopReason: 'Basic diagnosis stopped.',
      usedMockRunner: true,
      noAi: true
    }
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label} expected truthy value`);
  }
}
