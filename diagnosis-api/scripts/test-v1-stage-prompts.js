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
    if (testCase.name !== 'final prompt shape') {
      assert.match(content, /stageDecisionHints/, `${testCase.name} stageDecisionHints`);
    }
    assert.match(content, /promptVersion:/, `${testCase.name} promptVersion in user content`);

    if (testCase.name === 'basic prompt shape') {
      assert.match(content, /可见的人物、行为、道具、事件、规则或结尾方向/, 'basic material evidence constraint');
      assert.match(content, /不得把材料未明确写出/, 'basic no unsupported facts');
      assert.match(content, /可能.*看起来像.*需要进一步确认/, 'basic uncertainty wording');
      assert.match(content, /赎罪 \/ atonement/, 'basic atonement over-interpretation guard');
      assert.match(content, /缺什么、为什么影响 basic 判断、下一步怎么补/, 'basic specific suggestion shape');
      assert.match(content, /避免只写“人物成长”“情节结构”“主题表达”/, 'basic generic suggestion guard');
      assert.match(content, /nextStep 必须是具体动作/, 'basic concrete nextStep');
    }

    if (testCase.name === 'final prompt shape') {
      assert.match(content, /最终诊断归纳 \+ 下一步材料补强清单/, 'final positioning');
      assert.match(content, /不得输出 suggestions/, 'final no suggestions');
      assert.match(content, /顶层必须且只能包含 stage、maturity_level、final_assessment/, 'final strict top-level');
      assert.match(content, /v1-final-structure-1/, 'final structure version');
      assert.match(content, /evidence_from_material.*逐字来自材料正文/, 'final exact evidence');
      assert.match(content, /revision_direction.*只能是/, 'final controlled directions');
      assert.match(content, /missing_materials.*只能是/, 'final controlled missing materials');
      assert.match(content, /forbidden_generation_check/, 'final self check');
      assert.match(content, /服务端会独立复核/, 'final server validation authority');
      assert.match(content, /不得生成具体桥段、转折、场景、台词、结局、人物动机/, 'final no content writing');
      assert.match(content, /不得承诺拍摄、入选、商业化、融资/, 'final promise guard');
    }

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
