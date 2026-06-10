import assert from 'node:assert/strict';

import { V1_FINAL_PROMPT_VERSION, buildV1FinalDiagnosisMessages } from '../src/prompts/v1FinalDiagnosis.js';

const content = buildV1FinalDiagnosisMessages({
  text: '主角烧掉一封信，但材料没有解释这一选择的触发原因、压力和后果。',
  basicReport: { stage: 'basic', maturity_level: 'C' },
  advancedReport: { stage: 'advanced', maturity_level: 'C' }
}).map(message => String(message.content || '')).join('\n');

assert.equal(V1_FINAL_PROMPT_VERSION, 'v1-final-2026-06-patch5');
assert.match(content, /不是改写建议/);
assert.match(content, /不得生成具体桥段、转折、场景、台词、结局、人物动机、人物背景/);
assert.match(content, /不得使用“可以让”“建议安排”“可以设定”“例如让”“新增”“补写”/);
assert.match(content, /不得输出 suggestions/);
assert.match(content, /revision_direction 必须包含 1 到 3 项/);
assert.match(content, /missing_materials 最多 5 项/);
assert.match(content, /evidence_from_material 必须有 1 到 3 项/);

console.log('V1 final Patch 4 guards retained in Patch 5 structured prompt.');
