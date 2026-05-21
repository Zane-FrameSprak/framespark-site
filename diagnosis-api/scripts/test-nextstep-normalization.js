/**
 * nextStep normalization 测试
 *
 * 不调用真实 AI，只验证 reportParser 对进阶触发近义表达的保守规范化。
 */

import { normalizeNextStep, normalizeReport } from '../src/services/reportParser.js';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const STANDARD_PREFIX = '可进入进阶诊断';

const cases = [
  {
    name: '精确前缀不变且无 warning',
    run() {
      const result = normalizeNextStep('可进入进阶诊断：故事基础成立。');
      assertEqual(result.value, '可进入进阶诊断：故事基础成立。', 'value');
      assertEqual(result.warning, '', 'warning');
    }
  },
  {
    name: '近义肯定表达被规范化',
    run() {
      const values = [
        '可以进入进阶诊断：故事基础成立。',
        '建议进入进阶诊断：可以继续深入分析。',
        '可进入更深入诊断：故事骨架清楚。',
        '可以进行进阶评估：材料已具备进一步判断条件。',
        '建议进行更深入的故事诊断：人物和冲突已经可辨认。'
      ];
      for (const value of values) {
        const result = normalizeNextStep(value);
        assertTruthy(result.value.startsWith(STANDARD_PREFIX), `${value} normalized prefix`);
        assertTruthy(result.warning.includes('已规范化'), `${value} warning`);
      }
    }
  },
  {
    name: '否定表达不被规范化',
    run() {
      const values = [
        '暂不建议进入进阶诊断：人物目标仍不清楚。',
        '不建议进入进阶诊断：材料还缺少故事骨架。',
        '还不能进入进阶诊断：需要先补充关键事件。',
        '需要先补充材料后再进入进阶诊断。',
        '目前不适合进入进阶诊断：冲突方向不成立。'
      ];
      for (const value of values) {
        const result = normalizeNextStep(value);
        assertEqual(result.value, value, `${value} unchanged`);
        assertEqual(result.warning, '', `${value} warning`);
      }
    }
  },
  {
    name: 'normalizeReport 规范化时产生 _warnings',
    run() {
      const report = normalizeReport(makeRaw('可以进入进阶诊断：故事基础成立。'), 'short');
      assertTruthy(report.nextStep.startsWith(STANDARD_PREFIX), 'report.nextStep');
      assertTruthy(report._warnings?.some(item => item.includes('已规范化')), '_warnings');
    }
  },
  {
    name: '空 nextStep 或非字符串不崩溃',
    run() {
      const empty = normalizeNextStep('');
      assertEqual(empty.value, '', 'empty.value');
      assertEqual(empty.warning, '', 'empty.warning');

      const report = normalizeReport(makeRaw(null), 'short');
      assertTruthy(typeof report.nextStep === 'string', 'report.nextStep type');
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
  console.log(`\n${fail} nextStep normalization 测试失败：${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} nextStep normalization 测试通过：${cases.length}/${cases.length}\n`);

function makeRaw(nextStep) {
  return {
    summary: 'summary',
    core: 'core',
    strengths: [],
    problems: [],
    suggestions: [],
    nextStep
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
