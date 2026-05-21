/**
 * 进阶诊断基础摘要上下文测试
 *
 * 不调用真实 AI，只验证 pipeline 注入字段和进阶 prompt 文本。
 */

import { buildAdvancedPayload } from '../src/services/diagnosisPipeline.js';
import { buildAdvancedShortDiagnosisMessages } from '../src/prompts/advancedShortDiagnosis.js';
import { buildAdvancedFeatureDiagnosisMessages } from '../src/prompts/advancedFeatureDiagnosis.js';
import { buildAdvancedOtherDiagnosisMessages } from '../src/prompts/advancedOtherDiagnosis.js';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const basePayload = {
  text: '第一场，夜。主角在医院走廊等待一份迟到的诊断结果。'.repeat(40),
  stats: { charCount: 1200 },
  source: { filename: 'test.txt' },
  materialType: 'short',
  targetFormat: 'short',
  materialForm: 'full_script'
};

const basicReport = {
  summary: '材料已经具备故事骨架，但通过门槛较低。',
  core: '核心处境清楚，人物压力可辨认，但推进仍偏单薄。',
  nextStep: '可进入进阶诊断：建议进一步检查情绪推进和结尾落点。'
};

const cases = [
  {
    name: 'pipeline 注入 basicSummary / basicCore / basicNextStep',
    run() {
      const payload = buildAdvancedPayload(basePayload, basicReport);
      assertEqual(payload.basicSummary, basicReport.summary, 'basicSummary');
      assertEqual(payload.basicCore, basicReport.core, 'basicCore');
      assertEqual(payload.basicNextStep, basicReport.nextStep, 'basicNextStep');
      assertEqual(payload.text, basePayload.text, 'text remains');
    }
  },
  {
    name: '短片进阶 prompt 包含基础诊断摘要',
    run() {
      const text = userContent(buildAdvancedShortDiagnosisMessages(buildAdvancedPayload(basePayload, basicReport)));
      assertIncludes(text, '基础诊断摘要：', 'short context title');
      assertIncludes(text, `- 一句话结论：${basicReport.summary}`, 'short summary');
      assertIncludes(text, `- 核心判断：${basicReport.core}`, 'short core');
      assertIncludes(text, `- 下一步判断：${basicReport.nextStep}`, 'short nextStep');
      assertIncludes(text, '不要因为进入进阶就默认材料成熟', 'short caution');
    }
  },
  {
    name: '长片进阶 prompt 包含基础诊断摘要',
    run() {
      const payload = buildAdvancedPayload({ ...basePayload, materialType: 'feature', targetFormat: 'feature' }, basicReport);
      const text = userContent(buildAdvancedFeatureDiagnosisMessages(payload));
      assertIncludes(text, '基础诊断摘要：', 'feature context title');
      assertIncludes(text, basicReport.summary, 'feature summary');
      assertIncludes(text, basicReport.core, 'feature core');
      assertIncludes(text, basicReport.nextStep, 'feature nextStep');
    }
  },
  {
    name: 'other 进阶 prompt 包含基础诊断摘要',
    run() {
      const payload = buildAdvancedPayload({ ...basePayload, materialType: 'other', targetFormat: 'feature', materialForm: 'synopsis' }, basicReport);
      const text = userContent(buildAdvancedOtherDiagnosisMessages(payload));
      assertIncludes(text, '基础诊断摘要：', 'other context title');
      assertIncludes(text, basicReport.summary, 'other summary');
      assertIncludes(text, basicReport.core, 'other core');
      assertIncludes(text, basicReport.nextStep, 'other nextStep');
    }
  },
  {
    name: '没有基础摘要时进阶 prompt 不崩溃且不显示空摘要块',
    run() {
      const shortText = userContent(buildAdvancedShortDiagnosisMessages(basePayload));
      const featureText = userContent(buildAdvancedFeatureDiagnosisMessages(basePayload));
      const otherText = userContent(buildAdvancedOtherDiagnosisMessages(basePayload));
      assertNotIncludes(shortText, '基础诊断摘要：', 'short empty context');
      assertNotIncludes(featureText, '基础诊断摘要：', 'feature empty context');
      assertNotIncludes(otherText, '基础诊断摘要：', 'other empty context');
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
  console.log(`\n${fail} advanced context 测试失败：${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} advanced context 测试通过：${cases.length}/${cases.length}\n`);

function userContent(messages) {
  const message = messages.find(item => item.role === 'user');
  return message ? message.content : '';
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, pattern, label) {
  if (!text.includes(pattern)) {
    throw new Error(`${label} expected to include ${pattern}`);
  }
}

function assertNotIncludes(text, pattern, label) {
  if (text.includes(pattern)) {
    throw new Error(`${label} expected not to include ${pattern}`);
  }
}
