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
      assert.match(content, /材料没有充分支撑时.*不得把推测写成确定结论/, 'final material grounding');
      assert.match(content, /不得替作者编造新的过去经历、隐藏动机、人物关系或结局事实/, 'final no invented revision facts');
      assert.match(content, /不得用具体虚构情节替作者填空/, 'final no fictional rewrite examples');
      assert.match(content, /只能做诊断，不能替作者写作/, 'final diagnosis-not-rewrite boundary');
      assert.match(content, /不得设计具体剧情桥段、新转折、具体场景方案、具体台词、具体结局、人物新动机/, 'final no plot scene dialogue ending rewrite');
      assert.match(content, /不得变成具体剧情方案/, 'final direction not plot solution');
      assert.match(content, /烧信转折需要补充触发原因、角色选择压力和后果/, 'final diagnostic example');
      assert.match(content, /材料正文没有原样出现这些词.*任何输出字段都不得使用这些词/, 'final high-interpretation hard guard');
      assert.match(content, /recommendedAction 必须为 "complete_final"/, 'final stage closure action');
      assert.match(content, /不得输出 continue_final/, 'final no continue_final');
      assert.match(content, /maturity_level 为 B 或 C 时.*修改后再评估/, 'final B/C nextStep');
      assert.match(content, /不得把“整理项目档案”作为核心下一步/, 'final project-file demotion');
      assert.match(content, /故事核心修改：/, 'final story revision category');
      assert.match(content, /材料补充：/, 'final material supplement category');
      assert.match(content, /项目整理：.*最低优先级/, 'final project organization category');
      assert.match(content, /类别前不得添加数字、序号或其他文字/, 'final category prefix stability');
      assert.match(content, /问题：……；影响：……；修改方向：……；需要补充的材料：……/, 'final diagnostic suggestion structure');
      assert.match(content, /不得省略“问题 \/ 影响 \/ 修改方向 \/ 需要补充的材料”中的任何一项/, 'final required diagnostic fields');
      assert.match(content, /不得承诺可拍摄、可商业化、可融资、可投递/, 'final promise guard');
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
