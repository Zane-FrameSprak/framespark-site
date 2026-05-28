/**
 * reportV1 pipeline tests.
 *
 * These tests do not call real AI. They inject stub diagnosis engines into
 * diagnosisPipeline and verify the V1 switch, legacy fallback, and compatibility
 * response shape.
 */

import { ApiError } from '../src/utils/errors.js';
import { runDiagnosisPipelineWithEngines } from '../src/services/diagnosisPipeline.js';
import { normalizeReportV1 } from '../src/services/reportV1Parser.js';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const cases = [
  {
    name: 'ENABLE_DIAGNOSIS_V1=false keeps legacy pipeline behavior',
    async run() {
      let v1Called = false;
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateV1: async () => {
          v1Called = true;
          return makeReportV1();
        },
        generateBasic: async () => makeLegacyReport({
          nextStep: '建议继续打磨：先补强人物目标。'
        }),
        generateAdvanced: async () => makeLegacyReport({
          summary: 'advanced should not run'
        })
      }, {
        enableDiagnosisV1: false
      });

      assertEqual(v1Called, false, 'v1 called');
      assertEqual(result.internalStage, 'basic', 'internalStage');
      assertEqual(result.diagnosisDepth, 'basic', 'diagnosisDepth');
      assertEqual(result.reportV1, undefined, 'reportV1');
      assertEqual(result.finalReport.summary, '旧版兼容报告。', 'summary');
    }
  },
  {
    name: 'V1 success returns reportV1 plus legacy finalReport and basicReport',
    async run() {
      const reportV1 = normalizeReportV1(makeReportV1(), makePayload());
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateV1: async () => reportV1,
        generateBasic: async () => {
          throw new Error('legacy should not run');
        },
        generateAdvanced: async () => {
          throw new Error('advanced should not run');
        }
      }, {
        enableDiagnosisV1: true
      });

      assertEqual(result.internalStage, 'basic', 'internalStage');
      assertEqual(result.diagnosisDepth, 'basic', 'diagnosisDepth');
      assertEqual(result.diagnosisEngine, 'v1', 'diagnosisEngine');
      assertEqual(result.reportV1.material_type, 'screenplay', 'reportV1 material_type');
      assertEqual(result.finalReport.summary, reportV1.material_summary, 'legacy summary');
      assertDeepEqual(result.basicReport, result.finalReport, 'basicReport equals finalReport');
    }
  },
  {
    name: 'V1 parse failure falls back to legacy pipeline and returns fallback reportV1',
    async run() {
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateV1: async () => {
          throw new ApiError(422, 'V1_REPORT_INVALID', 'V1 parse failed');
        },
        generateBasic: async () => makeLegacyReport({
          summary: '旧链路兜底报告。',
          nextStep: '建议继续打磨：继续补充材料。'
        }),
        generateAdvanced: async () => makeLegacyReport({
          summary: 'advanced should not run'
        })
      }, {
        enableDiagnosisV1: true
      });

      assertEqual(result.internalStage, 'basic', 'internalStage');
      assertEqual(result.diagnosisEngine, 'legacy-fallback', 'diagnosisEngine');
      assertEqual(result.finalReport.summary, '旧链路兜底报告。', 'legacy summary');
      assertEqual(result.reportV1.diagnostics.fallback, true, 'fallback flag');
      assertEqual(result.reportV1.diagnostics.fallback_reason, 'V1_REPORT_INVALID', 'fallback reason');
    }
  },
  {
    name: 'D0 report maps without breaking legacy fields',
    async run() {
      const reportV1 = normalizeReportV1({
        material_type: 'non_story_material',
        primary_material_type: 'non_story_material',
        maturity_level: 'D0',
        material_summary: '这是一份合同条款。',
        rejection_reason: {
          code: 'NON_STORY_MATERIAL',
          message: '材料主要是合同信息，不包含可诊断的故事内容。'
        },
        priority_revisions: [
          { priority: 1, action: '请补充故事前提、人物和核心事件。', reason: '当前材料缺少故事信息。' }
        ],
        next_step: {
          label: '补充故事信息',
          detail: '补充后再进行诊断。'
        }
      }, makePayload());
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateV1: async () => reportV1,
        generateBasic: async () => makeLegacyReport(),
        generateAdvanced: async () => makeLegacyReport()
      }, {
        enableDiagnosisV1: true
      });

      assertEqual(result.finalReport.summary, '当前材料不适合故事开发诊断', 'D0 summary');
      assertTruthy(result.finalReport.problems.includes('材料主要是合同信息，不包含可诊断的故事内容。'), 'D0 problems');
    }
  },
  {
    name: 'project_package and mixed material do not break V1 pipeline',
    async run() {
      const reportV1 = normalizeReportV1({
        material_type: 'project_package',
        primary_material_type: 'project_package',
        secondary_material_types: ['synopsis', 'character_worldbuilding'],
        is_mixed_material: true,
        material_components: [
          { type: 'project_package', label: '项目介绍', description: '包含导演阐述。', confidence: 0.9 },
          { type: 'synopsis', label: '故事梗概', description: '包含故事线。', confidence: 0.8 }
        ],
        maturity_level: 'A',
        material_summary: '一份包含项目介绍和故事梗概的策划材料。',
        story_core: '项目已有基本故事方向。',
        strengths: ['项目定位较清楚'],
        main_problems: ['人物目标仍需更具体'],
        priority_revisions: ['补充主角目标和关键事件'],
        next_step: '可考虑整理项目档案。'
      }, makePayload({ materialForm: 'outline', materialType: 'other' }));
      const result = await runDiagnosisPipelineWithEngines(makePayload(), {
        generateV1: async () => reportV1,
        generateBasic: async () => makeLegacyReport(),
        generateAdvanced: async () => makeLegacyReport()
      }, {
        enableDiagnosisV1: true
      });

      assertEqual(result.reportV1.material_type, 'project_package', 'material_type');
      assertEqual(result.reportV1.is_mixed_material, true, 'mixed flag');
      assertEqual(result.reportV1.material_components.length, 2, 'components');
      assertEqual(result.finalReport.summary, '一份包含项目介绍和故事梗概的策划材料。', 'legacy summary');
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    await testCase.run();
    console.log(`${ok} ${c.bold}${testCase.name}${c.reset}`);
  } catch (err) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    console.log(`   ${c.red}${err.message}${c.reset}`);
  }
}

if (failed > 0) {
  console.log(`\n${fail} reportV1 pipeline tests failed: ${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} reportV1 pipeline tests passed: ${cases.length}/${cases.length}\n`);

function makePayload(overrides = {}) {
  return {
    text: '测试材料正文',
    materialType: 'other',
    userSelectedType: 'other',
    targetFormat: 'unknown',
    materialForm: 'synopsis',
    materialRouting: {
      targetFormat: 'unknown',
      materialForm: 'synopsis',
      effectiveDiagnosisType: 'other',
      reason: '测试路由'
    },
    inputMode: 'pasted_text',
    stats: { charCount: 1200, lineCount: 20 },
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
    material_type: 'screenplay',
    primary_material_type: 'screenplay',
    maturity_level: 'S',
    material_summary: '一个角色在封闭空间里面对关键选择。',
    format_hint: 'short_film_like',
    story_core: {
      premise: '主角必须在一夜内做出选择。',
      protagonist: '主角是一个年轻剪辑师。',
      conflict: '外部压力和内心愧疚冲突。',
      emotional_drive: '他想保住尊严。',
      theme_or_question: '人在压力下如何面对真实自我。'
    },
    strengths: [
      { title: '空间集中', detail: '场景集中，有利于短片表达。' }
    ],
    main_problems: [
      { title: '转折不足', severity: 'medium', detail: '中段事件递进还不够清楚。' }
    ],
    priority_revisions: [
      { priority: 1, action: '补强中段选择的代价。', reason: '让冲突更具体。' }
    ],
    next_step: {
      label: '可继续深化',
      detail: '建议先完善中段事件。'
    },
    conversion_advice: {
      status: 'ready',
      summary: '可考虑整理为项目档案，并进入帧火花内部进一步评估。',
      recommended_action: '整理项目档案。'
    },
    rejection_reason: {
      code: 'OTHER',
      message: ''
    },
    ...overrides
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label} expected ${expectedJson}, got ${actualJson}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label} expected truthy value`);
  }
}
