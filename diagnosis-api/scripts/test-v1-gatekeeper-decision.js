import assert from 'node:assert/strict';

import { evaluateV1Gatekeeper } from '../src/services/v1Gatekeeper.js';
import { decideV1Stage, isV1StageAction } from '../src/services/v1StageDecision.js';

const storyText = [
  '一个年轻导演回到海边小城，发现父亲留下的旧录像里藏着一段未完成的故事。',
  '她决定寻找当年参与拍摄的人，在调查过程中逐渐理解父亲沉默的原因。',
  '最终，她必须决定是公开真相，还是把这段记忆整理成一部新的电影。'
].join('');

const nonStoryText = [
  '本合同用于约定甲乙双方劳动关系、付款节点、交付标准和违约责任。',
  '双方应按照技术说明、交付清单和财务报表完成验收，并在指定日期前提交书面确认。',
  '如发生争议，应先进行书面沟通，再按照合同约定提交仲裁机构处理。'
].join('');

const cases = [
  {
    name: 'empty text => D0',
    run() {
      const result = evaluateV1Gatekeeper({ text: '' });
      assert.equal(result.decision, 'stop_d0');
      assert.equal(result.stage, 'D0');
      assert.equal(result.reportV1.maturity_level, 'D0');
    }
  },
  {
    name: 'short text => D0',
    run() {
      const result = evaluateV1Gatekeeper({ text: '一个女孩想拍电影。', minTextChars: 30 });
      assert.equal(result.decision, 'stop_d0');
      assert.equal(result.reportV1.rejection_reason.code, 'TOO_SHORT');
    }
  },
  {
    name: 'non-story text => D0',
    run() {
      const result = evaluateV1Gatekeeper({ text: nonStoryText });
      assert.equal(result.decision, 'stop_d0');
      assert.equal(result.reportV1.rejection_reason.code, 'NON_STORY_MATERIAL');
    }
  },
  {
    name: 'normal story text => allow_basic',
    run() {
      const result = evaluateV1Gatekeeper({ text: storyText });
      assert.equal(result.decision, 'allow_basic');
      assert.equal(result.nextStage, 'basic');
      assert.equal(result.reportV1, null);
    }
  },
  {
    name: 'basic not passed => stop_basic',
    run() {
      const decision = decideV1Stage({ stage: 'basic', passed: false, score: 0.3 });
      assert.equal(decision.action, 'stop_basic');
      assert.equal(decision.shouldContinue, false);
    }
  },
  {
    name: 'basic passed => continue_advanced',
    run() {
      const decision = decideV1Stage({ stage: 'basic', passed: true });
      assert.equal(decision.action, 'continue_advanced');
      assert.equal(decision.nextStage, 'advanced');
      assert.equal(decision.shouldContinue, true);
    }
  },
  {
    name: 'advanced passed => continue_final',
    run() {
      const decision = decideV1Stage({ stage: 'advanced', score: 0.82 });
      assert.equal(decision.action, 'continue_final');
      assert.equal(decision.nextStage, 'final');
    }
  },
  {
    name: 'final complete => complete_final',
    run() {
      const decision = decideV1Stage({ stage: 'final' });
      assert.equal(decision.action, 'complete_final');
      assert.equal(decision.shouldContinue, false);
      assert.equal(isV1StageAction(decision.action), true);
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
  console.log(`\nV1 gatekeeper/decision tests passed: ${cases.length}/${cases.length}\n`);
}
