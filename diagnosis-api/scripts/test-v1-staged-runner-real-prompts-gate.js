import assert from 'node:assert/strict';

import { runV1StagedDiagnosis } from '../src/services/v1StageRunner.js';
import { ApiError } from '../src/utils/errors.js';

const storyText = [
  '一个年轻导演回到家乡，试图寻找母亲年轻时拍摄的一卷旧胶片。',
  '她在寻找过程中发现家族、旧剧组和小镇都隐藏着不同版本的往事。',
  '最后她必须决定是否把真相拍成电影，并承担家庭关系再次破裂的代价。'
].join('');

const cases = [
  {
    name: 'default config => mock/no-AI and aiClient not called',
    async run() {
      let called = false;
      const result = await runV1StagedDiagnosis({ text: storyText }, {
        generateV1StageReport: async () => {
          called = true;
        }
      });
      assert.equal(called, false);
      assert.equal(result.diagnostics.usedMockRunner, true);
      assert.equal(result.diagnostics.noAi, true);
      assert.equal(result.diagnostics.realPromptsEnabled, false);
    }
  },
  {
    name: 'real prompts disabled => aiClient not called',
    async run() {
      let called = false;
      const result = await runV1StagedDiagnosis({ text: storyText }, {
        enableV1RealPrompts: false,
        generateV1StageReport: async () => {
          called = true;
        }
      });
      assert.equal(called, false);
      assert.equal(result.diagnostics.usedMockRunner, true);
    }
  },
  {
    name: 'real prompts enabled without aiClient => controlled error',
    async run() {
      await assert.rejects(
        () => runV1StagedDiagnosis({ text: storyText }, { enableV1RealPrompts: true }),
        error => error instanceof ApiError && error.code === 'V1_REAL_PROMPTS_NOT_CONFIGURED'
      );
    }
  },
  {
    name: 'real prompts enabled with mock aiClient => runs basic/advanced/final',
    async run() {
      const calls = [];
      const result = await runV1StagedDiagnosis({ text: storyText }, {
        enableV1RealPrompts: true,
        generateV1StageReport: async ({ stage, promptVersion }) => {
          calls.push(stage);
          return makeStageReport(stage, promptVersion, true);
        }
      });

      assert.deepEqual(calls, ['basic', 'advanced', 'final']);
      assert.equal(result.diagnostics.stageReached, 'final');
      assert.equal(result.diagnostics.usedMockRunner, false);
      assert.equal(result.diagnostics.noAi, false);
      assert.equal(result.diagnostics.realPromptsEnabled, true);
      assert.match(result.diagnostics.promptVersion, /^v1-final-/);
    }
  },
  {
    name: 'mock aiClient failure surfaces controlled error for pipeline fallback',
    async run() {
      await assert.rejects(
        () => runV1StagedDiagnosis({ text: storyText }, {
          enableV1RealPrompts: true,
          generateV1StageReport: async () => {
            throw new ApiError(502, 'MOCK_STAGE_FAILED', 'mock failure');
          }
        }),
        error => error instanceof ApiError && error.code === 'MOCK_STAGE_FAILED'
      );
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    await testCase.run();
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
  console.log(`\nV1 staged runner real prompt gate tests passed: ${cases.length}/${cases.length}\n`);
}

function makeStageReport(stage, promptVersion, passed) {
  return {
    stage,
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    maturity_level: stage === 'final' ? 'A' : 'B',
    material_summary: `${stage} summary`,
    story_core: `${stage} core`,
    strengths: ['strength'],
    main_problems: ['problem'],
    priority_revisions: ['revision'],
    next_step: 'next',
    conversion_advice: {
      status: stage === 'final' ? 'possible_after_revision' : 'not_applicable',
      summary: '',
      recommended_action: ''
    },
    rejection_reason: null,
    diagnostics: {
      stage,
      promptVersion,
      stageDecisionHints: {
        passed,
        reason: 'mock',
        recommendedAction: 'continue'
      }
    }
  };
}

