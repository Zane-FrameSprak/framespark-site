import assert from 'node:assert/strict';

import { generateV1StageReport } from '../src/services/aiClient.js';
import { ApiError } from '../src/utils/errors.js';

const cases = [
  {
    name: 'basic stage mock success',
    async run() {
      const result = await generateV1StageReport(makeRequest('basic'));
      assert.equal(result.stage, 'basic');
      assert.equal(result.material_summary, 'basic summary');
      assert.equal(result.diagnostics.promptVersion, 'test-basic');
    }
  },
  {
    name: 'advanced stage mock success',
    async run() {
      const result = await generateV1StageReport(makeRequest('advanced'));
      assert.equal(result.stage, 'advanced');
      assert.equal(result.material_summary, 'advanced summary');
    }
  },
  {
    name: 'final stage mock success',
    async run() {
      const result = await generateV1StageReport(makeRequest('final'));
      assert.equal(result.stage, 'final');
      assert.equal(result.conversion_advice.status, 'possible_after_revision');
    }
  },
  {
    name: 'invalid stage rejected',
    async run() {
      await assert.rejects(
        () => generateV1StageReport({ ...makeRequest('basic'), stage: 'unknown' }),
        error => error instanceof ApiError && error.code === 'V1_STAGE_INVALID'
      );
    }
  },
  {
    name: 'invalid json returns controlled error after retry',
    async run() {
      await assert.rejects(
        () => generateV1StageReport({
          stage: 'basic',
          promptVersion: 'test-basic',
          messages: makeMessages(),
          requestFn: async () => 'not json'
        }),
        error => error instanceof ApiError && error.code === 'AI_RESPONSE_INVALID'
      );
    }
  },
  {
    name: 'empty response returns controlled error after retry',
    async run() {
      await assert.rejects(
        () => generateV1StageReport({
          stage: 'basic',
          promptVersion: 'test-basic',
          messages: makeMessages(),
          requestFn: async () => ''
        }),
        error => error instanceof ApiError && error.code === 'AI_RESPONSE_INVALID'
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
  console.log(`\nV1 stage aiClient tests passed: ${cases.length}/${cases.length}\n`);
}

function makeRequest(stage) {
  return {
    stage,
    promptVersion: `test-${stage}`,
    messages: makeMessages(),
    payload: {
      materialRouting: { materialForm: 'synopsis' }
    },
    metadata: {
      primary_material_type: 'synopsis'
    },
    requestFn: async () => JSON.stringify({
      stage,
      maturity_level: stage === 'final' ? 'A' : 'B',
      summary: `${stage} summary`,
      core: `${stage} core`,
      strengths: ['strength'],
      problems: ['problem'],
      suggestions: ['suggestion'],
      nextStep: 'next step',
      stageDecisionHints: {
        passed: stage !== 'basic',
        reason: 'mock',
        recommendedAction: 'continue'
      },
      conversion_advice: {
        status: stage === 'final' ? 'possible_after_revision' : 'not_applicable',
        summary: '',
        recommended_action: ''
      }
    })
  };
}

function makeMessages() {
  return [
    { role: 'system', content: '只输出 JSON 对象。' },
    { role: 'user', content: '测试材料。' }
  ];
}

