/**
 * reportV1 compatibility tests.
 *
 * These tests do not call AI. They only verify the V1 report enums and the
 * legacy six-field adapter used during the migration period.
 */

import {
  CONVERSION_ADVICE_STATUSES,
  FORMAT_HINTS,
  MATERIAL_TYPES,
  MATURITY_LEVELS,
  REJECTION_REASON_CODES,
  isFormatHint,
  isMaterialType,
  isMaturityLevel
} from '../src/services/reportV1Schema.js';
import {
  normalizeReportV1ForCompat,
  reportV1ToLegacyReport
} from '../src/services/reportV1Compat.js';
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
    name: 'schema enums contain V1 product decisions',
    run() {
      assertIncludes(MATERIAL_TYPES, 'prose_fiction', 'material type');
      assertIncludes(MATERIAL_TYPES, 'project_package', 'material type');
      assertIncludes(MATERIAL_TYPES, 'non_story_material', 'material type');
      assertIncludes(MATURITY_LEVELS, 'S', 'maturity level');
      assertIncludes(MATURITY_LEVELS, 'D0', 'maturity level');
      assertIncludes(CONVERSION_ADVICE_STATUSES, 'possible_after_revision', 'conversion status');
      assertIncludes(REJECTION_REASON_CODES, 'POLICY_UNSUPPORTED', 'rejection code');
      assertIncludes(FORMAT_HINTS, 'series_like', 'format hint');
      assertTruthy(isMaterialType('screenplay'), 'isMaterialType');
      assertTruthy(isMaterialType('project_package'), 'project package material type');
      assertTruthy(isMaturityLevel('A'), 'isMaturityLevel');
      assertTruthy(isFormatHint('short_film_like'), 'isFormatHint');
    }
  },
  {
    name: 'primary_material_type and material_type alias stay compatible',
    run() {
      const fromPrimary = normalizeReportV1ForCompat({
        primary_material_type: 'project_package',
        maturity_level: 'A'
      });
      assertEqual(fromPrimary.primary_material_type, 'project_package', 'primary type');
      assertEqual(fromPrimary.material_type, 'project_package', 'material_type alias');

      const fromAlias = normalizeReportV1ForCompat({
        material_type: 'synopsis',
        maturity_level: 'B'
      });
      assertEqual(fromAlias.primary_material_type, 'synopsis', 'primary type from alias');
      assertEqual(fromAlias.material_type, 'synopsis', 'material_type alias from alias');
    }
  },
  {
    name: 'normal A/S report maps to legacy six fields',
    run() {
      const legacy = reportV1ToLegacyReport({
        material_type: 'screenplay',
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
          { title: '转折不足', detail: '中段事件递进还不够清楚。' }
        ],
        priority_revisions: [
          { priority: 1, action: '补强中段选择的代价。', reason: '让冲突更具体。' }
        ],
        next_step: {
          label: '可继续深化',
          detail: '建议先完善中段事件。'
        }
      });

      assertEqual(legacy.summary, '一个角色在封闭空间里面对关键选择。', 'summary');
      assertTruthy(legacy.core.includes('主角必须在一夜内做出选择。'), 'core premise');
      assertArrayIncludes(legacy.strengths, '场景集中，有利于短片表达。', 'strengths');
      assertArrayIncludes(legacy.problems, '中段事件递进还不够清楚。', 'problems');
      assertArrayIncludes(legacy.suggestions, '补强中段选择的代价。', 'suggestions');
      assertEqual(legacy.nextStep, '可继续深化：建议先完善中段事件。', 'nextStep');
    }
  },
  {
    name: 'B/C report maps with conservative fallbacks',
    run() {
      const legacy = reportV1ToLegacyReport({
        material_type: 'idea_concept',
        maturity_level: 'B',
        material_summary: '一个关于失踪父亲的创意概念。',
        story_core: {
          premise: '女儿寻找父亲留下的影像。',
          conflict: '线索不断指向她不愿面对的家庭真相。'
        },
        strengths: [],
        main_problems: [],
        priority_revisions: [],
        next_step: '补充人物目标和关键事件。'
      });

      assertEqual(legacy.summary, '一个关于失踪父亲的创意概念。', 'summary');
      assertTruthy(legacy.core.includes('女儿寻找父亲留下的影像。'), 'core');
      assertTruthy(legacy.strengths.length > 0, 'strength fallback');
      assertTruthy(legacy.problems.length > 0, 'problem fallback');
      assertTruthy(legacy.suggestions.length > 0, 'suggestion fallback');
      assertEqual(legacy.nextStep, '补充人物目标和关键事件。', 'nextStep');
    }
  },
  {
    name: 'D0 rejection maps to restrained legacy report',
    run() {
      const legacy = reportV1ToLegacyReport({
        material_type: 'non_story_material',
        maturity_level: 'D0',
        material_summary: '这是一份合同付款条款。',
        rejection_reason: {
          code: 'NON_STORY_MATERIAL',
          message: '材料主要是合同信息，不包含可诊断的故事内容。'
        },
        priority_revisions: [
          { action: '请补充故事前提、人物和核心事件。' }
        ]
      });

      assertEqual(legacy.summary, '当前材料不适合故事开发诊断', 'summary');
      assertEqual(legacy.core, '材料主要是合同信息，不包含可诊断的故事内容。', 'core');
      assertArrayIncludes(legacy.problems, '材料主要是合同信息，不包含可诊断的故事内容。', 'problems');
      assertArrayIncludes(legacy.suggestions, '请补充故事前提、人物和核心事件。', 'suggestions');
      assertEqual(legacy.nextStep, '建议补充明确的故事信息后再进行诊断。', 'nextStep');
    }
  },
  {
    name: 'missing fields and empty arrays do not break compatibility',
    run() {
      const normalized = normalizeReportV1ForCompat({
        maturity_level: 'unknown',
        format_hint: 'feature_film_like'
      });
      const legacy = reportV1ToLegacyReport(normalized);

      assertEqual(normalized.maturity_level, 'C', 'normalized maturity');
      assertEqual(normalized.primary_material_type, 'non_story_material', 'default primary type');
      assertEqual(normalized.material_type, 'non_story_material', 'default material type alias');
      assertDeepEqual(normalized.secondary_material_types, [], 'default secondary types');
      assertEqual(normalized.is_mixed_material, false, 'default mixed flag');
      assertDeepEqual(normalized.material_components, [], 'default material components');
      assertEqual(normalized.format_hint, 'feature_film_like', 'format hint preserved');
      assertTruthy(typeof legacy.summary === 'string', 'summary type');
      assertTruthy(typeof legacy.core === 'string', 'core type');
      assertTruthy(Array.isArray(legacy.strengths), 'strengths type');
      assertTruthy(Array.isArray(legacy.problems), 'problems type');
      assertTruthy(Array.isArray(legacy.suggestions), 'suggestions type');
      assertTruthy(typeof legacy.nextStep === 'string', 'nextStep type');
    }
  },
  {
    name: 'mixed material fields normalize without affecting legacy mapping',
    run() {
      const report = {
        primary_material_type: 'project_package',
        material_type: 'project_package',
        secondary_material_types: ['synopsis', 'character_worldbuilding', 'unknown_type', 'synopsis'],
        is_mixed_material: true,
        material_components: [
          {
            type: 'project_package',
            label: '项目介绍',
            description: '包含项目定位和导演阐述。',
            confidence: 0.92
          },
          {
            type: 'synopsis',
            label: '故事梗概',
            description: '包含主要剧情线。',
            confidence: 1.5
          },
          {
            type: 'unknown_type',
            label: '无效类型',
            description: '应被兜底。',
            confidence: -1
          }
        ],
        maturity_level: 'A',
        material_summary: '一份包含项目介绍和故事梗概的策划材料。',
        story_core: '项目已有基本故事方向。',
        strengths: ['项目表达较集中'],
        main_problems: ['故事冲突还需要更明确'],
        priority_revisions: ['补充主角目标和核心事件'],
        next_step: '可继续整理项目档案。'
      };

      const normalized = normalizeReportV1ForCompat(report);
      const legacy = reportV1ToLegacyReport(normalized);

      assertEqual(normalized.primary_material_type, 'project_package', 'primary type');
      assertDeepEqual(
        normalized.secondary_material_types,
        ['synopsis', 'character_worldbuilding'],
        'secondary types'
      );
      assertEqual(normalized.is_mixed_material, true, 'mixed flag');
      assertEqual(normalized.material_components.length, 3, 'components length');
      assertEqual(normalized.material_components[1].confidence, 1, 'confidence upper clamp');
      assertEqual(normalized.material_components[2].type, 'non_story_material', 'invalid component type fallback');
      assertEqual(normalized.material_components[2].confidence, 0, 'confidence lower clamp');
      assertEqual(legacy.summary, '一份包含项目介绍和故事梗概的策划材料。', 'legacy summary');
      assertArrayIncludes(legacy.suggestions, '补充主角目标和核心事件', 'legacy suggestions');
    }
  },
  {
    name: 'format_hint exists but does not affect legacy mapping',
    run() {
      const base = {
        material_type: 'screenplay',
        maturity_level: 'A',
        material_summary: '同一个剧本摘要。',
        story_core: '同一个故事核心。',
        strengths: ['亮点一致'],
        main_problems: ['问题一致'],
        priority_revisions: ['建议一致'],
        next_step: '下一步一致'
      };
      const shortLike = reportV1ToLegacyReport({ ...base, format_hint: 'short_film_like' });
      const seriesLike = reportV1ToLegacyReport({ ...base, format_hint: 'series_like' });

      assertDeepEqual(shortLike, seriesLike, 'legacy output');
    }
  },
  {
    name: 'parser supplies stable nextStep fallback when next_step is missing',
    run() {
      const normalized = normalizeReportV1({
        material_type: 'idea_concept',
        maturity_level: 'C',
        material_summary: '一个早期故事概念。',
        story_core: '主角和事件链仍需补充。',
        next_step: {}
      });

      assertTruthy(normalized.nextStep.length > 0, 'nextStep fallback');
      assertTruthy(normalized.next_step.detail.length > 0, 'next_step detail fallback');
      assertEqual(normalized.next_step.summary, normalized.next_step.detail, 'next_step summary');
      assertEqual(normalized.next_step.action, normalized.next_step.detail, 'next_step action');
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    testCase.run();
    console.log(`${ok} ${c.bold}${testCase.name}${c.reset}`);
  } catch (err) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    console.log(`   ${c.red}${err.message}${c.reset}`);
  }
}

if (failed > 0) {
  console.log(`\n${fail} reportV1 compatibility tests failed: ${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} reportV1 compatibility tests passed: ${cases.length}/${cases.length}\n`);

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

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`${label} expected to include ${expected}`);
  }
}

function assertArrayIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`${label} expected to include ${expected}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label} expected truthy value`);
  }
}
