import assert from 'node:assert/strict';

import { V1_FINAL_PROMPT_VERSION, buildV1FinalDiagnosisMessages } from '../src/prompts/v1FinalDiagnosis.js';

const content = buildV1FinalDiagnosisMessages({
  text: '一个人物面临具体选择，但故事仍有因果和材料缺口。',
  basicReport: { stage: 'basic', maturity_level: 'B' },
  advancedReport: { stage: 'advanced', maturity_level: 'B' }
}).map(message => String(message.content || '')).join('\n');

assert.equal(V1_FINAL_PROMPT_VERSION, 'v1-final-2026-06-patch5');
assert.match(content, /救赎.*赎罪.*atonement.*redemption/);
assert.match(content, /原文未出现时不得使用/);
assert.match(content, /不得承诺拍摄、入选、商业化、融资/);
assert.match(content, /action 只能是 revise_then_reassess, supplement_then_reassess, internal_review, not_recommended/);
assert.doesNotMatch(content, /continue_final/);

console.log('V1 final Patch 3 guards retained in Patch 5 structured prompt.');
