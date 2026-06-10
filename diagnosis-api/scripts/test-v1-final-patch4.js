import assert from 'node:assert/strict';

import {
  V1_FINAL_PROMPT_VERSION,
  buildV1FinalDiagnosisMessages
} from '../src/prompts/v1FinalDiagnosis.js';

const messages = buildV1FinalDiagnosisMessages({
  text: '主角烧掉一封信，但材料没有解释这一选择的触发原因、压力和后果。',
  materialHint: { primary_material_type: 'synopsis' },
  stats: { charCount: 900 },
  source: { filename: 'patch4-regression.txt' },
  basicReport: { stage: 'basic', maturity_level: 'C' },
  advancedReport: {
    stage: 'advanced',
    maturity_level: 'C',
    problems: ['关键转折缺少因果铺垫。']
  }
});

const content = messages.map((message) => String(message.content || '')).join('\n');

assert.equal(V1_FINAL_PROMPT_VERSION, 'v1-final-2026-06-patch4');
assert.match(content, /只能做诊断，不能替作者写作/);
assert.match(content, /不得输出可直接放进剧本、梗概或人物小传的新增内容/);
assert.match(content, /不得设计具体剧情桥段、新转折、具体场景方案、具体台词、具体结局、人物新动机或人物新背景/);
assert.match(content, /不得使用“可以让主角……”“可以安排……”“可以设定……”/);
assert.match(content, /允许指出规则不清、转折缺铺垫、人物动机缺依据、结构节点薄弱/);
assert.match(content, /只能举诊断式表达的例子/);
assert.match(content, /烧信转折需要补充触发原因、角色选择压力和后果/);
assert.match(content, /问题：……；影响：……；修改方向：……；需要补充的材料：……/);
assert.match(content, /“问题”只指出材料缺口/);
assert.match(content, /“影响”只解释该缺口为什么影响判断/);
assert.match(content, /“修改方向”只能说明要补强的叙事功能、因果关系、选择压力、规则边界或结构作用/);
assert.match(content, /不得变成具体剧情方案/);
assert.match(content, /不得替作者写出这些信息的具体内容/);
assert.match(content, /不得省略“问题 \/ 影响 \/ 修改方向 \/ 需要补充的材料”中的任何一项/);

// Patch 3 guards must remain in the same final prompt.
assert.match(content, /任何输出字段都不得使用这些词/);
assert.match(content, /recommendedAction 必须为 "complete_final"/);
assert.match(content, /不得输出 continue_final/);
assert.match(content, /不得把“整理项目档案”作为核心下一步/);
assert.match(content, /不得承诺可拍摄、可商业化、可融资、可投递/);

console.log('V1 final Patch 4 prompt regression passed.');
