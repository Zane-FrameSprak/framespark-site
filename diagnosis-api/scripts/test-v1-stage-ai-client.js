import assert from 'node:assert/strict';

import { generateV1StageReport } from '../src/services/aiClient.js';
import { ApiError } from '../src/utils/errors.js';

const SOURCE = '阿青带着石鸡离开村庄。母亲的信没有说明烧信决定的触发原因。阿青在山口烧掉信件。';

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
    name: 'final structured stage mock success',
    async run() {
      const result = await generateV1StageReport(makeFinalRequest([makeFinalRaw()]));
      assert.equal(result.stage, 'final');
      assert.equal(result.final_assessment.structure_version, 'v1-final-structure-1');
      assert.equal(result.conversion_advice.status, 'possible_after_revision');
      assert.equal(result.diagnostics.finalRetryCount, 0);
      assert.equal(result.diagnostics.finalOutputSafety.serverValidated, true);
      assert.ok(result.main_problems.length > 0);
      assert.ok(result.priority_revisions.length > 0);
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
    name: 'invalid json returns controlled error after retry for non-final stage',
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
    name: 'final unsafe first response repairs once and succeeds',
    async run() {
      let calls = 0;
      const unsafe = makeFinalRaw();
      unsafe.final_assessment.core_blockers[0].impact_summary = '可以让阿青发现母亲的秘密。';
      const request = makeFinalRequest([unsafe, makeFinalRaw()], () => { calls += 1; });
      const result = await generateV1StageReport(request);

      assert.equal(calls, 2);
      assert.equal(result.diagnostics.finalRetryCount, 1);
      assert.equal(result.diagnostics.jsonRetry, true);
      assert.equal(result.diagnostics.fallback, false);
    }
  },
  {
    name: 'final unsafe twice becomes controlled failure without third call',
    async run() {
      let calls = 0;
      const unsafe = makeFinalRaw();
      unsafe.final_assessment.core_blockers[0].problem_summary = '建议安排一场山口对峙场景。';
      const request = makeFinalRequest([unsafe, unsafe], () => { calls += 1; });

      await assert.rejects(
        () => generateV1StageReport(request),
        error => error instanceof ApiError && error.code === 'V1_FINAL_OUTPUT_UNSAFE'
      );
      assert.equal(calls, 2);
    }
  },
  {
    name: 'final timeout is not retried',
    async run() {
      let calls = 0;
      await assert.rejects(
        () => generateV1StageReport({
          ...makeFinalRequest([]),
          requestFn: async () => {
            calls += 1;
            throw new ApiError(504, 'AI_REQUEST_TIMEOUT', 'timeout');
          }
        }),
        error => error instanceof ApiError && error.code === 'AI_REQUEST_TIMEOUT'
      );
      assert.equal(calls, 1);
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
    console.error(error?.stack || error);
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
    payload: { materialRouting: { materialForm: 'synopsis' } },
    metadata: { primary_material_type: 'synopsis' },
    requestFn: async () => JSON.stringify({
      stage,
      maturity_level: 'B',
      summary: `${stage} summary`,
      core: `${stage} core`,
      strengths: ['strength'],
      problems: ['problem'],
      suggestions: ['suggestion'],
      nextStep: 'next step',
      stageDecisionHints: {
        passed: true,
        reason: 'mock',
        recommendedAction: 'continue'
      },
      conversion_advice: {
        status: 'not_applicable',
        summary: '',
        recommended_action: ''
      }
    })
  };
}

function makeFinalRequest(responses, onCall = () => {}) {
  let index = 0;
  return {
    stage: 'final',
    promptVersion: 'v1-final-test',
    messages: makeMessages(),
    payload: { text: SOURCE },
    metadata: { primary_material_type: 'synopsis' },
    context: {
      sourceText: SOURCE,
      basicReport: makePriorReport('基础摘要。'),
      advancedReport: makePriorReport('进阶摘要。')
    },
    requestFn: async () => {
      onCall();
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return JSON.stringify(response);
    }
  };
}

function makeFinalRaw() {
  return {
    stage: 'final',
    maturity_level: 'B',
    final_assessment: {
      structure_version: 'v1-final-structure-1',
      core_blockers: [
        {
          id: 'burn-letter-trigger',
          blocker_type: 'transition_setup_gap',
          problem_summary: '烧信决定缺少可验证的触发原因。',
          evidence_from_material: ['没有说明烧信决定的触发原因', '阿青在山口烧掉信件'],
          impact_code: 'causal_clarity',
          impact_summary: '关键转折与前序事件之间的因果连接不足。',
          revision_direction: ['strengthen_existing_setup'],
          missing_materials: ['trigger_reason', 'prior_setup']
        }
      ],
      next_step: {
        action: 'revise_then_reassess',
        focus_blocker_ids: ['burn-letter-trigger']
      },
      forbidden_generation_check: {
        passed: true,
        risk_types: [],
        note: '仅描述材料缺口。'
      }
    }
  };
}

function makePriorReport(summary) {
  return {
    material_type: 'synopsis',
    primary_material_type: 'synopsis',
    maturity_level: 'B',
    material_summary: summary,
    story_core: { premise: '阿青带着石鸡离开村庄。' },
    strengths: [{ title: '核心道具', detail: '石鸡贯穿故事。' }]
  };
}

function makeMessages() {
  return [
    { role: 'system', content: '只输出 JSON 对象。' },
    { role: 'user', content: '测试材料。' }
  ];
}
