import assert from 'node:assert/strict';

import {
  V1_FINAL_PROMPT_VERSION,
  buildV1FinalDiagnosisMessages
} from '../src/prompts/v1FinalDiagnosis.js';

const messages = buildV1FinalDiagnosisMessages({
  text: '一个人物面临具体选择，但故事仍有因果和材料缺口。',
  materialHint: { primary_material_type: 'synopsis' },
  stats: { charCount: 1200 },
  source: { filename: 'patch3-regression.txt' },
  basicReport: { stage: 'basic', maturity_level: 'B' },
  advancedReport: {
    stage: 'advanced',
    maturity_level: 'B',
    main_problems: [{ title: '因果缺口', detail: '关键选择仍需铺垫。' }]
  }
});

const content = messages.map((message) => String(message.content || '')).join('\n');

assert.equal(V1_FINAL_PROMPT_VERSION, 'v1-final-2026-06-patch3b');
assert.match(content, /不得把推测写成确定结论/);
assert.match(content, /可能存在，但需要材料确认/);
assert.match(content, /不得替作者编造新的过去经历、隐藏动机、人物关系或结局事实/);
assert.match(content, /不得用具体虚构情节替作者填空/);
assert.match(content, /让作者自行选择具体内容/);
assert.match(content, /材料正文没有原样出现这些词/);
assert.match(content, /任何输出字段都不得使用这些词/);
assert.match(content, /recommendedAction 必须为 "complete_final"/);
assert.match(content, /不得输出 continue_final/);
assert.match(content, /maturity_level 为 B 或 C 时/);
assert.match(content, /修改后再评估/);
assert.match(content, /补强具体材料/);
assert.match(content, /不得把“整理项目档案”作为核心下一步/);
assert.match(content, /故事核心修改：/);
assert.match(content, /材料补充：/);
assert.match(content, /项目整理：/);
assert.match(content, /最低优先级辅助建议/);
assert.match(content, /类别前不得添加数字、序号或其他文字/);
assert.match(content, /不得承诺可拍摄、可商业化、可融资、可投递/);
assert.doesNotMatch(content, /保证拍摄|保证入选|保证融资|必然商业成功/);

console.log('V1 final Patch 3 prompt regression passed.');
