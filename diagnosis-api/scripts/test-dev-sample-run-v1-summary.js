import assert from 'assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  appendDiagnosisResults,
  appendSamples,
  createSampleRun
} from '../src/services/sampleRunStore.js';

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-v1-summary-'));
const sampleRoot = path.join(tempRoot, 'test-runs', 'sample-diagnosis');

try {
  const run = await createSampleRun({ name: 'v1 summary' }, {
    root: sampleRoot,
    now: new Date('2026-06-05T00:00:00.000Z')
  });

  await appendSamples(run.runId, [{
    sampleId: 'sample-001',
    name: 'V1 摘要样本',
    text: '一个虚构短片梗概样本，用于验证内部测试结果只保存 V1 摘要字段。'
  }], { root: sampleRoot });

  const saved = await appendDiagnosisResults(run.runId, [{
    resultId: 'result-v1',
    sampleId: 'sample-001',
    sampleName: 'V1 摘要样本',
    mode: 'mock',
    materialType: 'short',
    targetFormat: 'short',
    materialForm: 'synopsis',
    effectiveDiagnosisType: 'short',
    diagnosisDepth: 'basic',
    diagnosisId: 'diag-v1',
    summary: 'legacy summary',
    core: 'legacy core',
    nextStep: 'legacy nextStep',
    report: {
      summary: 'legacy summary',
      core: 'legacy core',
      nextStep: 'legacy nextStep'
    },
    reportV1: {
      stage: 'advanced',
      maturity_level: 'B',
      material_summary: '完整 V1 正文不应进入 sample run 结果。',
      next_step: {
        summary: '继续进入终极诊断前，先补强人物选择。'
      },
      diagnostics: {
        stageReached: 'advanced',
        decision: 'continue_final',
        promptVersion: 'v1-advanced-2026-06',
        model: 'deepseek-v4-flash',
        fallback: false,
        latencyMs: 1234,
        stageStatus: {
          basic: 'passed',
          advanced: 'reached',
          final: 'pending'
        }
      }
    }
  }], { root: sampleRoot, now: new Date('2026-06-05T00:10:00.000Z') });

  assert.equal(saved.savedCount, 1);
  const indexRecord = saved.saved[0];
  assert.equal(indexRecord.summary, 'legacy summary');
  assert.equal(indexRecord.core, 'legacy core');
  assert.equal(indexRecord.nextStep, 'legacy nextStep');
  assert.equal(indexRecord.hasReportV1, true);
  assert.equal(indexRecord.v1StageReached, 'advanced');
  assert.equal(indexRecord.v1Decision, 'continue_final');
  assert.equal(indexRecord.v1PromptVersion, 'v1-advanced-2026-06');
  assert.equal(indexRecord.v1Model, 'deepseek-v4-flash');
  assert.equal(indexRecord.v1Fallback, false);
  assert.equal(indexRecord.v1LatencyMs, 1234);
  assert.equal(indexRecord.v1MaturityLevel, 'B');
  assert.equal(indexRecord.v1Stage, 'advanced');
  assert.equal(indexRecord.v1StageStatus.final, 'pending');

  const runDir = path.join(sampleRoot, run.runId);
  const indexRaw = await fs.readFile(path.join(runDir, 'results-index.json'), 'utf8');
  assert.match(indexRaw, /"hasReportV1": true/);
  assert.match(indexRaw, /"v1StageReached": "advanced"/);
  assert.doesNotMatch(indexRaw, /"reportV1"/, 'results-index should not store the full V1 object');
  assert.doesNotMatch(indexRaw, /完整 V1 正文/, 'results-index should not store V1 body text');

  const fullResultRaw = await fs.readFile(path.join(runDir, indexRecord.resultPath), 'utf8');
  assert.match(fullResultRaw, /"report"/, 'legacy report should still be saved');
  assert.match(fullResultRaw, /"hasReportV1": true/);
  assert.doesNotMatch(fullResultRaw, /"reportV1"/, 'full result should not store the full V1 object');
  assert.doesNotMatch(fullResultRaw, /完整 V1 正文/, 'full result should not store V1 body text');

  const noDiagnostics = await appendDiagnosisResults(run.runId, [{
    resultId: 'result-no-diagnostics',
    sampleId: 'sample-001',
    sampleName: '无 diagnostics 样本',
    mode: 'mock',
    summary: 'no diagnostics summary',
    reportV1: {
      stage: 'basic',
      maturity_level: 'A'
    }
  }], { root: sampleRoot, now: new Date('2026-06-05T00:20:00.000Z') });
  assert.equal(noDiagnostics.saved[0].hasReportV1, true);
  assert.equal(noDiagnostics.saved[0].v1StageReached, 'basic');
  assert.equal(noDiagnostics.saved[0].v1PromptVersion, '');

  const fallback = await appendDiagnosisResults(run.runId, [{
    resultId: 'result-fallback',
    sampleId: 'sample-001',
    sampleName: 'fallback 样本',
    mode: 'mock',
    summary: 'fallback summary',
    reportV1: {
      stage: 'basic',
      maturity_level: 'D0',
      diagnostics: {
        fallback: true,
        stageReached: 'basic',
        decision: 'stop_basic',
        promptVersion: 'v1-basic-2026-06'
      }
    }
  }], { root: sampleRoot, now: new Date('2026-06-05T00:30:00.000Z') });
  assert.equal(fallback.saved[0].v1Fallback, true);
  assert.equal(fallback.saved[0].v1Decision, 'stop_basic');

  console.log('dev sample run V1 summary checks passed');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
