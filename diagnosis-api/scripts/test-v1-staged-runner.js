import assert from 'node:assert/strict';

import { runV1StagedDiagnosisMock } from '../src/services/v1StageRunner.js';

const storyText = [
  '一个纪录片导演回到家乡，发现母亲年轻时参与过一场被遗忘的电影拍摄。',
  '她开始寻找当年的演员和胶片，在调查中发现每个人都隐瞒了不同的真相。',
  '最后她必须决定是否把这段历史拍成电影，并面对家庭关系的重新破裂。'
].join('');

const nonStoryText = [
  '本说明用于描述接口文档、合同条款、验收标准和财务报表提交时间。',
  '各部门应按照技术说明完成交付，并在指定日期前提交书面确认。',
  '若验收过程中出现争议，应由管理部门根据合同附件和付款节点进行复核。'
].join('');

const cases = [
  {
    name: 'empty text => D0',
    run() {
      const result = runV1StagedDiagnosisMock({ text: '' });
      assert.equal(result.diagnostics.stageReached, 'D0');
      assert.equal(result.diagnostics.decision, 'stop_d0');
      assert.equal(result.reportV1.maturity_level, 'D0');
    }
  },
  {
    name: 'short text => D0',
    run() {
      const result = runV1StagedDiagnosisMock({ text: '一个女孩想拍电影。', minTextChars: 60 });
      assert.equal(result.diagnostics.stageReached, 'D0');
      assert.equal(result.reportV1.rejection_reason.code, 'TOO_SHORT');
    }
  },
  {
    name: 'non-story => D0',
    run() {
      const result = runV1StagedDiagnosisMock({ text: nonStoryText });
      assert.equal(result.diagnostics.stageReached, 'D0');
      assert.equal(result.reportV1.rejection_reason.code, 'NON_STORY_MATERIAL');
    }
  },
  {
    name: 'basic stop',
    run() {
      const result = runV1StagedDiagnosisMock({
        text: storyText,
        mockOutcome: { basicPassed: false }
      });
      assert.equal(result.diagnostics.stageReached, 'basic');
      assert.equal(result.diagnostics.decision, 'stop_basic');
      assert.equal(result.reportV1.stage, 'basic');
    }
  },
  {
    name: 'continue advanced then stop before final',
    run() {
      const result = runV1StagedDiagnosisMock({
        text: storyText,
        mockOutcome: { basicPassed: true, advancedPassed: false }
      });
      assert.equal(result.diagnostics.stageReached, 'advanced');
      assert.equal(result.reportV1.stage, 'advanced');
      assert.equal(result.diagnostics.decisions.some((item) => item.decision === 'continue_advanced'), true);
    }
  },
  {
    name: 'continue final and complete',
    run() {
      const result = runV1StagedDiagnosisMock({
        text: storyText,
        mockOutcome: { basicPassed: true, advancedPassed: true, finalMaturityLevel: 'S' }
      });
      assert.equal(result.diagnostics.stageReached, 'final');
      assert.equal(result.diagnostics.decision, 'complete_final');
      assert.equal(result.reportV1.maturity_level, 'S');
    }
  },
  {
    name: 'mixed material placeholder does not crash',
    run() {
      const result = runV1StagedDiagnosisMock({
        text: storyText,
        materialHint: {
          primary_material_type: 'synopsis',
          secondary_material_types: ['character_worldbuilding'],
          is_mixed_material: true,
          material_components: [
            { type: 'synopsis', label: '梗概', confidence: 0.8 },
            { type: 'character_worldbuilding', label: '人物设定', confidence: 0.6 }
          ]
        }
      });
      assert.equal(result.reportV1.is_mixed_material, true);
      assert.equal(result.reportV1.secondary_material_types[0], 'character_worldbuilding');
    }
  },
  {
    name: 'project_package placeholder does not crash',
    run() {
      const result = runV1StagedDiagnosisMock({
        text: storyText,
        materialHint: { primary_material_type: 'project_package' }
      });
      assert.equal(result.reportV1.primary_material_type, 'project_package');
      assert.equal(result.diagnostics.noAi, true);
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    testCase.run();
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
  console.log(`\nV1 staged runner tests passed: ${cases.length}/${cases.length}\n`);
}
