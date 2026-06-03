import assert from 'node:assert/strict';

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

const HIGH_RISK_PROMISES = [
  '保证拍摄',
  '保证入选',
  '保证融资',
  '一定会',
  '必然商业成功'
];

const cases = [
  {
    name: 'basic prompt shape',
    version: V1_BASIC_PROMPT_VERSION,
    messages: buildV1BasicDiagnosisMessages(makePayload()),
    forbidden: ['项目转化建议', '融资']
  },
  {
    name: 'advanced prompt shape',
    version: V1_ADVANCED_PROMPT_VERSION,
    messages: buildV1AdvancedDiagnosisMessages({
      ...makePayload(),
      basicReport: { summary: '基础诊断通过。' }
    }),
    forbidden: ['终极项目转化', '融资']
  },
  {
    name: 'final prompt shape',
    version: V1_FINAL_PROMPT_VERSION,
    messages: buildV1FinalDiagnosisMessages({
      ...makePayload(),
      basicReport: { summary: '基础诊断通过。' },
      advancedReport: { summary: '进阶诊断通过。' }
    }),
    forbidden: HIGH_RISK_PROMISES
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    assert.ok(testCase.version && testCase.version.includes('2026-06'), `${testCase.name} promptVersion`);
    assert.ok(Array.isArray(testCase.messages), `${testCase.name} messages array`);
    assert.ok(testCase.messages.length >= 2, `${testCase.name} messages length`);

    const content = flattenMessages(testCase.messages);
    assert.match(content, /只输出 JSON 对象/, `${testCase.name} JSON-only`);
    assert.match(content, /stageDecisionHints/, `${testCase.name} stageDecisionHints`);
    assert.match(content, /promptVersion:/, `${testCase.name} promptVersion in user content`);

    for (const forbidden of testCase.forbidden) {
      assert.equal(content.includes(forbidden), false, `${testCase.name} forbidden ${forbidden}`);
    }

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
  console.log(`\nV1 stage prompt tests passed: ${cases.length}/${cases.length}\n`);
}

function makePayload() {
  return {
    text: '一个年轻导演回到家乡，试图寻找母亲年轻时拍摄的一卷旧胶片。',
    materialHint: { primary_material_type: 'synopsis' },
    stats: { charCount: 1200 },
    source: { filename: 'sample.txt' }
  };
}

function flattenMessages(messages) {
  return messages.map((message) => String(message.content || '')).join('\n');
}

