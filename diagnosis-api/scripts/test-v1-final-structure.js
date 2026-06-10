import assert from 'node:assert/strict';

import { normalizeReportV1 } from '../src/services/reportV1Parser.js';
import { reportV1ToLegacyReport } from '../src/services/reportV1Compat.js';
import { normalizeV1FinalAssessment } from '../src/services/v1FinalAssessment.js';
import { ApiError } from '../src/utils/errors.js';

const SOURCE = [
  '阿青带着石鸡离开村庄，途中发现石鸡每到夜晚就会变重。',
  '他收到母亲留下的信，却没有说明烧信决定的触发原因。',
  '阿青在山口烧掉信件，随后独自继续赶路。'
].join('');

const cases = [
  {
    name: 'valid final structure derives compatible report fields',
    run() {
      const report = normalizeV1FinalAssessment(makeRaw(), makeContext());
      const normalized = normalizeReportV1(report, {});
      const legacy = reportV1ToLegacyReport(normalized);

      assert.equal(report.final_assessment.structure_version, 'v1-final-structure-1');
      assert.equal(report.material_summary, '进阶阶段沿用的材料摘要。');
      assert.deepEqual(report.story_core, { premise: '阿青带着石鸡离开村庄。' });
      assert.deepEqual(report.strengths, [{ title: '核心道具', detail: '石鸡贯穿故事。' }]);
      assert.equal(report.main_problems.length, 2);
      assert.match(report.priority_revisions[0].action, /修改方向：/);
      assert.equal(report.next_step.action, 'revise_then_reassess');
      assert.equal(report.diagnostics.stageDecisionHints.recommendedAction, 'complete_final');
      assert.equal(report.diagnostics.finalOutputSafety.serverValidated, true);
      assert.equal(normalized.final_assessment.structure_version, 'v1-final-structure-1');
      assert.ok(legacy.problems.length > 0);
      assert.ok(legacy.suggestions.length > 0);
      assert.match(legacy.nextStep, /修改后再评估/);
    }
  },
  {
    name: 'unknown top-level field is rejected',
    run() {
      const raw = makeRaw();
      raw.suggestions = ['不应接受'];
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_STRUCTURE_INVALID');
    }
  },
  {
    name: 'missing assessment field is rejected',
    run() {
      const raw = makeRaw();
      delete raw.final_assessment.next_step;
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_STRUCTURE_INVALID');
    }
  },
  {
    name: 'invalid enum is rejected',
    run() {
      const raw = makeRaw();
      raw.final_assessment.core_blockers[0].blocker_type = 'plot_solution';
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_STRUCTURE_INVALID');
    }
  },
  {
    name: 'overlong free text is rejected',
    run() {
      const raw = makeRaw();
      raw.final_assessment.core_blockers[0].problem_summary = '长'.repeat(121);
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_STRUCTURE_INVALID');
    }
  },
  {
    name: 'evidence absent from source is rejected',
    run() {
      const raw = makeRaw();
      raw.final_assessment.core_blockers[0].evidence_from_material = ['原文中不存在的证据'];
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_STRUCTURE_INVALID');
    }
  },
  {
    name: 'concrete plot rewrite is rejected',
    run() {
      const raw = makeRaw();
      raw.final_assessment.core_blockers[0].problem_summary = '可以让阿青发现母亲的秘密来补足动机。';
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_REWRITE_RISK');
    }
  },
  {
    name: 'scene dialogue ending and rule answers are rejected',
    run() {
      for (const unsafe of [
        '建议安排一场山口对峙场景。',
        '台词可以：“你终于明白了。”',
        '结局可以改为阿青带着石鸡返乡。',
        '新增石鸡遇火后会复活的规则。'
      ]) {
        const raw = makeRaw();
        raw.final_assessment.core_blockers[0].impact_summary = unsafe;
        assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_REWRITE_RISK');
      }
    }
  },
  {
    name: 'unsupported high-interpretation term is rejected',
    run() {
      const raw = makeRaw();
      raw.final_assessment.core_blockers[0].impact_summary = '这会削弱主角的救赎主题。';
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_REWRITE_RISK');
    }
  },
  {
    name: 'self-check risk is rejected by server',
    run() {
      const raw = makeRaw();
      raw.final_assessment.forbidden_generation_check = {
        passed: false,
        risk_types: ['concrete_plot'],
        note: '检测到风险。'
      };
      assertFinalError(() => normalizeV1FinalAssessment(raw, makeContext()), 'V1_FINAL_REWRITE_RISK');
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
    console.error(error?.stack || error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`\nV1 final structure tests passed: ${cases.length}/${cases.length}\n`);
}

function makeRaw() {
  return {
    stage: 'final',
    maturity_level: 'B',
    final_assessment: {
      structure_version: 'v1-final-structure-1',
      core_blockers: [
        {
          id: 'burn-letter-trigger',
          blocker_type: 'transition_setup_gap',
          problem_summary: '烧信决定缺少可验证的触发原因和选择依据。',
          evidence_from_material: ['没有说明烧信决定的触发原因', '阿青在山口烧掉信件'],
          impact_code: 'causal_clarity',
          impact_summary: '关键转折与前序事件之间的因果连接不足。',
          revision_direction: ['strengthen_existing_setup', 'clarify_choice_pressure'],
          missing_materials: ['trigger_reason', 'choice_basis', 'prior_setup']
        },
        {
          id: 'stone-chicken-rule',
          blocker_type: 'rule_gap',
          problem_summary: '石鸡变重的规则边界尚未形成可判断的信息。',
          evidence_from_material: ['石鸡每到夜晚就会变重'],
          impact_code: 'rule_coherence',
          impact_summary: '规则与人物行动之间的约束关系不清楚。',
          revision_direction: ['clarify_rule_boundaries'],
          missing_materials: ['rule_boundary', 'consequence']
        }
      ],
      next_step: {
        action: 'revise_then_reassess',
        focus_blocker_ids: ['burn-letter-trigger', 'stone-chicken-rule']
      },
      forbidden_generation_check: {
        passed: true,
        risk_types: [],
        note: '仅描述材料缺口，没有生成具体内容。'
      }
    }
  };
}

function makeContext() {
  return {
    sourceText: SOURCE,
    basicReport: {
      material_type: 'synopsis',
      primary_material_type: 'synopsis',
      material_summary: '基础阶段材料摘要。',
      story_core: { premise: '阿青带着石鸡离开村庄。' },
      strengths: [{ title: '核心道具', detail: '石鸡贯穿故事。' }]
    },
    advancedReport: {
      material_type: 'synopsis',
      primary_material_type: 'synopsis',
      material_summary: '进阶阶段沿用的材料摘要。',
      story_core: { premise: '阿青带着石鸡离开村庄。' },
      strengths: [{ title: '核心道具', detail: '石鸡贯穿故事。' }],
      format_hint: 'short_film_like'
    }
  };
}

function assertFinalError(fn, code) {
  assert.throws(fn, error => error instanceof ApiError && error.code === code);
}
