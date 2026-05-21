import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import { fileURLToPath } from 'url';
import { loadReviewQueue, formatRecords } from './list-review-queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-review-queue-'));
const logRoot = path.join(tempRoot, 'logs', 'diagnosis');

try {
  await seedFixture(logRoot);

  const allRecords = await loadReviewQueue({ logRoot, limit: 10 });
  assert.equal(allRecords.length, 3, 'should load warning, boundary and feedback records');
  assert.deepEqual(allRecords.map(item => item.type).sort(), ['boundary', 'feedback', 'warning']);

  const limited = await loadReviewQueue({ logRoot, limit: 1 });
  assert.equal(limited.length, 1, 'limit should be applied');

  const feedbackOnly = await loadReviewQueue({ logRoot, type: 'feedback', limit: 10 });
  assert.equal(feedbackOnly.length, 1, 'type filter should return only feedback');
  assert.equal(feedbackOnly[0].diagnosisId, '20260521-feedback-target');

  const rendered = formatRecords(allRecords);
  assert.match(rendered, /type=warning/);
  assert.match(rendered, /type=boundary/);
  assert.match(rendered, /type=feedback/);
  assert.doesNotMatch(rendered, /这是一段不应输出的用户原文全文/);

  const emptyRecords = await loadReviewQueue({ logRoot: path.join(tempRoot, 'empty'), limit: 20 });
  assert.equal(emptyRecords.length, 0, 'empty directory should not throw');
  assert.equal(formatRecords(emptyRecords), '暂无待复查记录。\n');

  console.log('review queue checks passed');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

async function seedFixture(root) {
  await fs.mkdir(path.join(root, 'review-queue', 'warning'), { recursive: true });
  await fs.mkdir(path.join(root, 'review-queue', 'boundary'), { recursive: true });
  await fs.mkdir(path.join(root, 'review-queue', 'user-feedback'), { recursive: true });

  const warningEntry = {
    id: '20260521-warning-id',
    createdAt: '2026-05-21T09:00:00.000Z',
    internalStage: 'basic',
    diagnosisDepth: 'basic',
    materialRouting: {
      targetFormat: 'short',
      materialForm: 'concept'
    },
    warnings: ['nextStep 前缀不在白名单'],
    finalReport: {
      summary: '一个短片故事概念的测试摘要。'
    },
    basicReportSummary: {
      summary: '基础摘要'
    },
    finalNextStep: '建议继续打磨'
  };
  await writeDiagnosisFixture(root, 'warning', warningEntry);

  const boundaryEntry = {
    id: '20260521-boundary-id',
    createdAt: '2026-05-21T10:00:00.000Z',
    internalStage: 'advanced',
    diagnosisDepth: 'advanced',
    materialRouting: {
      targetFormat: 'feature',
      materialForm: 'synopsis'
    },
    warnings: [],
    finalReport: {
      summary: '一个长片梗概的边界样本摘要。'
    },
    finalNextStep: '建议继续打磨：主线因果仍需确认。'
  };
  await writeDiagnosisFixture(root, 'boundary', boundaryEntry);

  const feedbackEntry = {
    id: 'fb-20260521-feedback-id',
    createdAt: '2026-05-21T11:00:00.000Z',
    diagnosisId: '20260521-feedback-target',
    areas: ['material_form_wrong'],
    comment: '这是一段不应输出的用户原文全文。这里模拟用户反馈说明。',
    materialRouting: {
      targetFormat: 'short',
      materialForm: 'fragment'
    },
    reportSummary: '用户认为材料形态判断有误。',
    reportNextStep: '建议补充材料'
  };
  await fs.writeFile(
    path.join(root, 'review-queue', 'user-feedback', `${feedbackEntry.id}.json`),
    JSON.stringify(feedbackEntry, null, 2),
    'utf8'
  );
}

async function writeDiagnosisFixture(root, queue, entry) {
  const logDir = path.join(root, 'by-date', '2026-05-21');
  const logPath = path.join(logDir, `${entry.id}.json`);
  const relativeLogPath = path.relative(API_ROOT, logPath).split(path.sep).join('/');
  await fs.mkdir(logDir, { recursive: true });
  await fs.writeFile(logPath, JSON.stringify(entry, null, 2), 'utf8');
  await fs.writeFile(
    path.join(root, 'review-queue', queue, `${entry.id}.md`),
    [
      `# ${entry.id}`,
      '',
      `createdAt: ${entry.createdAt}`,
      `materialType: other`,
      `internalStage: ${entry.internalStage}`,
      `finalNextStep: ${entry.finalNextStep}`,
      '',
      `分类原因：fixture`,
      '',
      `原始 JSON 日志路径：${relativeLogPath}`,
      ''
    ].join('\n'),
    'utf8'
  );
}
