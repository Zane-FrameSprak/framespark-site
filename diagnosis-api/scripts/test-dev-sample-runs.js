import assert from 'assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  appendSamples,
  createSampleRun,
  listSampleRuns,
  readSampleRun
} from '../src/services/sampleRunStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-dev-samples-'));
const sampleRoot = path.join(tempRoot, 'test-runs', 'sample-diagnosis');

try {
  const serverSource = await fs.readFile(path.join(API_ROOT, 'src/server.js'), 'utf8');
  assert.match(serverSource, /config\.enableDevTools/, 'server should gate dev route behind ENABLE_DEV_TOOLS');
  assert.match(serverSource, /\/api\/dev\/sample-runs/, 'server should mount dev sample route only in gated block');

  const run = await createSampleRun({
    name: 'short concept test',
    sameStory: true,
    storyName: '测试故事',
    storyRelation: '概念 + 梗概',
    notes: '边界样本测试'
  }, {
    root: sampleRoot,
    now: new Date('2026-05-21T00:00:00.000Z')
  });
  assert.equal(run.runId, '2026-05-21-short-concept-test');
  assert.equal(run.sameStory, true);
  assert.equal(run.storyName, '测试故事');
  assert.equal(run.storyRelation, '概念 + 梗概');

  const duplicate = await createSampleRun({ name: 'short concept test' }, {
    root: sampleRoot,
    now: new Date('2026-05-21T01:00:00.000Z')
  });
  assert.equal(duplicate.runId, '2026-05-21-short-concept-test-002');

  await assert.rejects(
    () => readSampleRun('../logs', { root: sampleRoot }),
    /测试批次 ID 不合法/
  );

  const saved = await appendSamples(run.runId, [{
    sampleId: 'sample-001',
    name: '短片概念',
    sourceType: 'pasted-text',
    originalFileName: '',
    targetFormatExpected: 'short',
    materialFormExpected: 'concept',
    expectedDiagnosisDepth: 'basic',
    testFocus: 'concept 准入',
    text: '一个完整但较短的故事概念，用于测试样本保存。'
  }], { root: sampleRoot });
  assert.equal(saved.savedCount, 1);
  assert.equal(saved.samples[0].textPath, 'samples/sample-001-短片概念.txt');

  const sampleText = await fs.readFile(path.join(sampleRoot, run.runId, saved.samples[0].textPath), 'utf8');
  assert.equal(sampleText, '一个完整但较短的故事概念，用于测试样本保存。');

  const indexRaw = await fs.readFile(path.join(sampleRoot, run.runId, 'samples-index.json'), 'utf8');
  assert.doesNotMatch(indexRaw, /一个完整但较短的故事概念/, 'samples-index should not store full text');
  assert.match(await fs.readFile(path.join(sampleRoot, run.runId, 'samples.md'), 'utf8'), /sample-001/);
  assert.match(await fs.readFile(path.join(sampleRoot, run.runId, 'run-meta.json'), 'utf8'), /"sameStory": true/);

  const runs = await listSampleRuns({ root: sampleRoot });
  assert.equal(runs.length, 2);

  await assert.rejects(
    () => appendSamples(run.runId, Array.from({ length: 51 }, (_, index) => ({
      sampleId: `too-many-${index}`,
      text: '测试'
    })), { root: sampleRoot }),
    /单次最多保存/
  );

  await assert.rejects(
    () => appendSamples(run.runId, [{ sampleId: 'big', text: 'x'.repeat(1024 * 1024 + 1) }], { root: sampleRoot }),
    /不能超过 1MB/
  );

  await assert.rejects(
    () => fs.access(path.join(tempRoot, 'logs')),
    /ENOENT/,
    'dev sample store should not write logs'
  );

  console.log('dev sample run checks passed');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
