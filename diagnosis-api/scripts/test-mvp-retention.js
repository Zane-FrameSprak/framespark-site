import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-retention-'));
process.env.DIAGNOSIS_DATA_DIR = tempRoot;
process.env.DIAGNOSIS_METADATA_RETENTION_DAYS = '30';
process.env.DIAGNOSIS_REVIEW_RETENTION_DAYS = '14';

const { logDiagnosisResult, cleanupExpiredDiagnosisData } = await import('../src/services/diagnosisLogger.js');

try {
  const defaultEntry = await logDiagnosisResult(makeInput(false, 'DEFAULT_PRIVATE_MATERIAL', 'DEFAULT_PRIVATE_REPORT'));
  assert.ok(defaultEntry?.id);
  const defaultMetadataPath = metadataPath(defaultEntry);
  const defaultMetadata = await fs.readFile(defaultMetadataPath, 'utf8');
  assert.equal(defaultMetadata.includes('DEFAULT_PRIVATE_MATERIAL'), false);
  assert.equal(defaultMetadata.includes('DEFAULT_PRIVATE_REPORT'), false);
  assert.equal(defaultMetadata.includes('private-story.txt'), false);
  await assert.rejects(() => fs.access(reviewPath(defaultEntry)), error => error.code === 'ENOENT');

  const retainedEntry = await logDiagnosisResult(makeInput(true, 'CONSENTED_PRIVATE_MATERIAL', 'CONSENTED_PRIVATE_REPORT'));
  const retainedRaw = await fs.readFile(reviewPath(retainedEntry), 'utf8');
  const retained = JSON.parse(retainedRaw);
  assert.equal(retained.material.text, 'CONSENTED_PRIVATE_MATERIAL');
  assert.equal(retained.reportV1.material_summary, 'CONSENTED_PRIVATE_REPORT');
  assert.equal(daysBetween(retained.createdAt, retained.expiresAt), 14);
  assert.equal(daysBetween(defaultEntry.createdAt, defaultEntry.expiresAt), 30);

  await expireJson(metadataPath(retainedEntry));
  await expireJson(reviewPath(retainedEntry));
  await expireIndexEntry(retainedEntry.id);
  await cleanupExpiredDiagnosisData();
  await assert.rejects(() => fs.access(metadataPath(retainedEntry)), error => error.code === 'ENOENT');
  await assert.rejects(() => fs.access(reviewPath(retainedEntry)), error => error.code === 'ENOENT');
  const index = JSON.parse(await fs.readFile(indexPath(), 'utf8'));
  assert.equal(index.some(item => item.id === retainedEntry.id), false);

  console.log('MVP retention tests passed: metadata redaction, 14-day consent retention, expiry cleanup');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

function makeInput(reviewConsent, material, report) {
  return {
    mode: 'mock',
    betaIdentity: 'invited-reviewer',
    materialType: 'other',
    materialRouting: { materialForm: 'synopsis', targetFormat: 'short' },
    inputMode: 'file_upload',
    parsed: { source: { filename: 'private-story.txt', type: 'txt' }, text: material },
    stats: { charCount: material.length },
    result: {
      internalStage: 'basic',
      diagnosisEngine: 'v1-staged',
      diagnostics: { decision: 'stop_basic', providerCalls: 1 },
      reportV1: { material_summary: report }
    },
    reviewConsent
  };
}

function metadataPath(entry) {
  return path.join(tempRoot, 'diagnosis', 'metadata', 'by-date', entry.createdAt.slice(0, 10), `${entry.id}.json`);
}

function reviewPath(entry) {
  return path.join(tempRoot, 'diagnosis', 'review-consent', `${entry.id}.json`);
}

function indexPath() {
  return path.join(tempRoot, 'diagnosis', 'metadata', 'index.json');
}

async function expireJson(file) {
  const value = JSON.parse(await fs.readFile(file, 'utf8'));
  value.expiresAt = '2000-01-01T00:00:00.000Z';
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

async function expireIndexEntry(id) {
  const file = indexPath();
  const index = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const item of index) if (item.id === id) item.expiresAt = '2000-01-01T00:00:00.000Z';
  await fs.writeFile(file, JSON.stringify(index, null, 2));
}

function daysBetween(start, end) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
}
