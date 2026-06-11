import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { diagnosisVersions } from '../config/diagnosisVersion.js';

const METADATA_ROOT = path.join(config.dataDir, 'diagnosis', 'metadata');
const REVIEW_ROOT = path.join(config.dataDir, 'diagnosis', 'review-consent');
const INDEX_PATH = path.join(METADATA_ROOT, 'index.json');

export async function logDiagnosisResult(input) {
  try {
    const entry = buildMetadataEntry(input);
    const metadataPath = await writeMetadataEntry(entry);
    await updateIndex(entry, metadataPath);
    if (input.reviewConsent) {
      await writeRetainedReview(entry, input);
    }
    await cleanupExpiredDiagnosisData();
    return entry;
  } catch (error) {
    console.warn('[diagnosis-logger] metadata write failed:', error.code || error.name || 'UNKNOWN');
    return null;
  }
}

function buildMetadataEntry({ mode, betaIdentity, materialType, materialRouting, inputMode, stats, result, reviewConsent }) {
  const createdAt = new Date().toISOString();
  const diagnostics = result?.diagnostics || result?.reportV1?.diagnostics || {};
  return {
    id: makeId(createdAt),
    createdAt,
    expiresAt: addDays(createdAt, config.metadataRetentionDays),
    betaIdentityHash: hashIdentity(betaIdentity),
    materialType,
    materialForm: materialRouting?.materialForm || 'unknown',
    targetFormat: materialRouting?.targetFormat || 'unknown',
    inputMode: inputMode === 'file_upload' ? 'file_upload' : 'pasted_text',
    charCount: Number(stats?.charCount || 0),
    stage: result?.internalStage || result?.reportV1?.stage || 'unknown',
    diagnosisEngine: result?.diagnosisEngine || mode,
    decision: diagnostics.decision || diagnostics.stageDecisionHints?.recommendedAction || null,
    promptVersion: diagnostics.promptVersion || null,
    model: mode === 'ai' ? config.deepseekModel : 'mock',
    fallback: result?.diagnosisEngine === 'legacy-fallback' || diagnostics.fallback === true,
    providerCalls: Number.isInteger(diagnostics.providerCalls) ? diagnostics.providerCalls : null,
    reviewConsent: Boolean(reviewConsent),
    versions: diagnosisVersions
  };
}

async function writeMetadataEntry(entry) {
  const date = entry.createdAt.slice(0, 10);
  const dir = path.join(METADATA_ROOT, 'by-date', date);
  const fullPath = path.join(dir, `${entry.id}.json`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(entry, null, 2), { encoding: 'utf8', mode: 0o600 });
  return path.relative(config.dataDir, fullPath).split(path.sep).join('/');
}

async function writeRetainedReview(entry, { parsed, result }) {
  const record = {
    id: entry.id,
    createdAt: entry.createdAt,
    expiresAt: addDays(entry.createdAt, config.reviewRetentionDays),
    betaIdentityHash: entry.betaIdentityHash,
    material: {
      inputMode: entry.inputMode,
      sourceType: parsed?.source?.type || 'unknown',
      text: String(parsed?.text || '')
    },
    reportV1: result?.reportV1 || null
  };
  await fs.mkdir(REVIEW_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(REVIEW_ROOT, `${entry.id}.json`),
    JSON.stringify(record, null, 2),
    { encoding: 'utf8', mode: 0o600 }
  );
}

async function updateIndex(entry, metadataPath) {
  await fs.mkdir(METADATA_ROOT, { recursive: true });
  const index = await readJsonArray(INDEX_PATH);
  const record = {
    id: entry.id,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    stage: entry.stage,
    decision: entry.decision,
    fallback: entry.fallback,
    reviewConsent: entry.reviewConsent,
    metadataPath
  };
  const next = [record, ...index.filter(item => item.id !== entry.id && !isExpired(item.expiresAt))];
  await fs.writeFile(INDEX_PATH, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export async function cleanupExpiredDiagnosisData() {
  await Promise.all([
    cleanupDirectory(path.join(METADATA_ROOT, 'by-date')),
    cleanupDirectory(REVIEW_ROOT)
  ]);
  await cleanupExpiredIndex();
}

async function cleanupExpiredIndex() {
  const index = await readJsonArray(INDEX_PATH);
  const active = index.filter(item => !isExpired(item.expiresAt));
  if (active.length === index.length) return;
  await fs.writeFile(INDEX_PATH, JSON.stringify(active, null, 2), { encoding: 'utf8', mode: 0o600 });
}

async function cleanupDirectory(root) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await cleanupDirectory(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try {
      const record = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      if (isExpired(record.expiresAt)) await fs.unlink(fullPath);
    } catch {
      // Keep malformed files for manual inspection; never delete unknown data automatically.
    }
  }
}

async function readJsonArray(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function hashIdentity(value) {
  const identity = String(value || 'unknown');
  return crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20);
}

function addDays(iso, days) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function isExpired(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function makeId(createdAt) {
  const timestamp = createdAt.replace(/[-:.]/g, '').replace('T', '-').replace('Z', '');
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}
