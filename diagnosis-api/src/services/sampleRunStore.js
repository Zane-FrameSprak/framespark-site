import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, '../..');
const SAMPLE_ROOT = path.join(API_ROOT, 'test-runs', 'sample-diagnosis');
const MAX_SAMPLE_BYTES = 1024 * 1024;
const MAX_SAMPLES_PER_SAVE = 50;
const VALID_EXPECTED_TARGETS = new Set(['short', 'feature', 'other', 'unknown', '']);
const VALID_EXPECTED_FORMS = new Set([
  'concept',
  'synopsis',
  'outline',
  'character_bio',
  'worldbuilding',
  'fragment',
  'full_script',
  'unknown',
  ''
]);
const VALID_EXPECTED_DEPTHS = new Set(['basic', 'advanced', 'unknown', '']);

export async function listSampleRuns({ root = SAMPLE_ROOT } = {}) {
  await ensureRoot(root);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSafeRunId(entry.name)) continue;
    const run = await readSampleRun(entry.name, { root });
    runs.push(run);
  }
  return runs.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function createSampleRun(input = {}, { root = SAMPLE_ROOT, now = new Date() } = {}) {
  await ensureRoot(root);
  const date = formatDate(now);
  const safeName = slugify(input.name);
  const runId = await resolveRunId(root, date, safeName);
  const runDir = getRunDir(root, runId);
  const createdAt = now.toISOString();
  const meta = {
    runId,
    createdAt,
    sameStory: Boolean(input.sameStory),
    storyName: sanitizeText(input.storyName, 200),
    storyRelation: sanitizeText(input.storyRelation, 500),
    notes: sanitizeText(input.notes, 2000),
    source: 'diagnosis-eval-console'
  };

  await fs.mkdir(path.join(runDir, 'samples'), { recursive: true });
  await fs.mkdir(path.join(runDir, 'results'), { recursive: true });
  await writeJson(path.join(runDir, 'run-meta.json'), meta);
  await writeJson(path.join(runDir, 'samples-index.json'), []);
  await fs.writeFile(path.join(runDir, 'run-notes.md'), buildRunNotes(meta), 'utf8');
  await fs.writeFile(path.join(runDir, 'review-notes.md'), buildReviewNotes(), 'utf8');

  return readSampleRun(runId, { root });
}

export async function readSampleRun(runId, { root = SAMPLE_ROOT } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const runDir = getRunDir(root, safeRunId);
  const meta = await readJson(path.join(runDir, 'run-meta.json'), null);
  const samples = await readJson(path.join(runDir, 'samples-index.json'), []);
  if (!meta) {
    return {
      runId: safeRunId,
      createdAt: '',
      sameStory: false,
      storyName: '',
      storyRelation: '',
      notes: '',
      source: '',
      samples: Array.isArray(samples) ? samples : []
    };
  }
  return {
    ...meta,
    samples: Array.isArray(samples) ? samples : []
  };
}

export async function updateSampleRunMeta(runId, patch = {}, { root = SAMPLE_ROOT } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const runDir = getRunDir(root, safeRunId);
  const current = await readJson(path.join(runDir, 'run-meta.json'), null);
  if (!current) {
    throw new ApiError(404, 'RUN_NOT_FOUND', '测试批次不存在。');
  }
  const next = {
    ...current,
    sameStory: patch.sameStory === undefined ? current.sameStory : Boolean(patch.sameStory),
    storyName: patch.storyName === undefined ? current.storyName : sanitizeText(patch.storyName, 200),
    storyRelation: patch.storyRelation === undefined ? current.storyRelation : sanitizeText(patch.storyRelation, 500),
    notes: patch.notes === undefined ? current.notes : sanitizeText(patch.notes, 2000),
    updatedAt: new Date().toISOString()
  };
  await writeJson(path.join(runDir, 'run-meta.json'), next);
  return readSampleRun(safeRunId, { root });
}

export async function appendSamples(runId, rawSamples = [], { root = SAMPLE_ROOT } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const samples = Array.isArray(rawSamples) ? rawSamples : [];
  if (samples.length === 0) {
    throw new ApiError(400, 'SAMPLES_REQUIRED', '请至少提供一个测试样本。');
  }
  if (samples.length > MAX_SAMPLES_PER_SAVE) {
    throw new ApiError(413, 'TOO_MANY_SAMPLES', `单次最多保存 ${MAX_SAMPLES_PER_SAVE} 个样本。`);
  }

  const runDir = getRunDir(root, safeRunId);
  await ensureRunExists(runDir);
  const sampleDir = path.join(runDir, 'samples');
  await fs.mkdir(sampleDir, { recursive: true });

  const indexPath = path.join(runDir, 'samples-index.json');
  const currentIndex = await readJson(indexPath, []);
  const nextIndex = Array.isArray(currentIndex) ? [...currentIndex] : [];
  const usedIds = new Set(nextIndex.map(item => item.sampleId));
  const saved = [];

  for (const raw of samples) {
    const sample = normalizeSample(raw, usedIds);
    usedIds.add(sample.sampleId);
    const filename = `${sample.sampleId}-${slugify(sample.name || sample.originalFileName || 'sample') || 'sample'}.txt`;
    const relativePath = `samples/${filename}`;
    await fs.writeFile(path.join(runDir, relativePath), sample.text, 'utf8');

    const record = {
      sampleId: sample.sampleId,
      name: sample.name,
      sourceType: sample.sourceType,
      originalFileName: sample.originalFileName,
      targetFormatExpected: sample.targetFormatExpected,
      materialFormExpected: sample.materialFormExpected,
      expectedDiagnosisDepth: sample.expectedDiagnosisDepth,
      testFocus: sample.testFocus,
      charCount: sample.text.length,
      textPath: relativePath,
      createdAt: new Date().toISOString()
    };
    nextIndex.push(record);
    saved.push(record);
  }

  await writeJson(indexPath, nextIndex);
  await fs.writeFile(path.join(runDir, 'samples.md'), buildSamplesMarkdown(nextIndex), 'utf8');
  return {
    runId: safeRunId,
    savedCount: saved.length,
    samples: nextIndex
  };
}

function normalizeSample(raw, usedIds) {
  const sample = raw && typeof raw === 'object' ? raw : {};
  const text = normalizeSampleText(sample.text);
  if (!text) {
    throw new ApiError(400, 'SAMPLE_TEXT_REQUIRED', '样本文本不能为空。');
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_SAMPLE_BYTES) {
    throw new ApiError(413, 'SAMPLE_TOO_LARGE', '单个样本文本不能超过 1MB。');
  }

  const baseId = slugify(sample.sampleId) || nextSampleId(usedIds);
  const sampleId = uniqueId(baseId, usedIds);
  const targetFormatExpected = normalizeEnum(sample.targetFormatExpected, VALID_EXPECTED_TARGETS, 'unknown');
  const materialFormExpected = normalizeEnum(sample.materialFormExpected, VALID_EXPECTED_FORMS, 'unknown');
  const expectedDiagnosisDepth = normalizeEnum(sample.expectedDiagnosisDepth, VALID_EXPECTED_DEPTHS, 'unknown');

  return {
    sampleId,
    name: sanitizeText(sample.name, 160) || sampleId,
    sourceType: sanitizeText(sample.sourceType, 64) || 'pasted-text',
    originalFileName: sanitizeText(sample.originalFileName, 255),
    targetFormatExpected,
    materialFormExpected,
    expectedDiagnosisDepth,
    testFocus: sanitizeText(sample.testFocus, 1000),
    text
  };
}

async function resolveRunId(root, date, customName) {
  if (customName) {
    const base = `${date}-${customName}`;
    if (!await exists(getRunDir(root, base))) return base;
    let index = 2;
    while (true) {
      const candidate = `${base}-${String(index).padStart(3, '0')}`;
      if (!await exists(getRunDir(root, candidate))) return candidate;
      index += 1;
    }
  }

  let index = 1;
  while (true) {
    const candidate = `${date}-manual-${String(index).padStart(3, '0')}`;
    if (!await exists(getRunDir(root, candidate))) return candidate;
    index += 1;
  }
}

async function ensureRoot(root) {
  await fs.mkdir(root, { recursive: true });
}

async function ensureRunExists(runDir) {
  try {
    const stat = await fs.stat(runDir);
    if (!stat.isDirectory()) throw new Error('not directory');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ApiError(404, 'RUN_NOT_FOUND', '测试批次不存在。');
    }
    throw err;
  }
}

function getRunDir(root, runId) {
  const safeRunId = assertSafeRunId(runId);
  const fullPath = path.resolve(root, safeRunId);
  const rootPath = path.resolve(root);
  if (!fullPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new ApiError(400, 'INVALID_RUN_ID', '测试批次 ID 不合法。');
  }
  return fullPath;
}

function assertSafeRunId(runId) {
  const value = String(runId || '').trim();
  if (!isSafeRunId(value)) {
    throw new ApiError(400, 'INVALID_RUN_ID', '测试批次 ID 不合法。');
  }
  return value;
}

function isSafeRunId(value) {
  return /^\d{4}-\d{2}-\d{2}-[a-z0-9\u4e00-\u9fa5_-]+(?:-\d{3})?$/.test(String(value || ''));
}

function nextSampleId(usedIds) {
  let index = usedIds.size + 1;
  while (true) {
    const candidate = `sample-${String(index).padStart(3, '0')}`;
    if (!usedIds.has(candidate)) return candidate;
    index += 1;
  }
}

function uniqueId(baseId, usedIds) {
  if (!usedIds.has(baseId)) return baseId;
  let index = 2;
  while (true) {
    const candidate = `${baseId}-${String(index).padStart(3, '0')}`;
    if (!usedIds.has(candidate)) return candidate;
    index += 1;
  }
}

function normalizeEnum(value, allowed, fallback) {
  const text = String(value || '').trim();
  return allowed.has(text) ? text : fallback;
}

function sanitizeText(value, maxLen) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, maxLen);
}

function normalizeSampleText(value) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildRunNotes(meta) {
  return [
    `# ${meta.runId}`,
    '',
    '本文件用于记录本轮诊断样本测试目的、样本来源和人工说明。',
    '',
    `createdAt: ${meta.createdAt}`,
    `sameStory: ${meta.sameStory}`,
    `storyName: ${meta.storyName || '未填写'}`,
    `storyRelation: ${meta.storyRelation || '未填写'}`,
    '',
    '## 备注',
    '',
    meta.notes || '（无）',
    ''
  ].join('\n');
}

function buildReviewNotes() {
  return [
    '# 人工复盘记录',
    '',
    '## 本轮总体结论',
    '',
    '-',
    '',
    '## 路由问题',
    '',
    '-',
    '',
    '## guard 问题',
    '',
    '-',
    '',
    '## prompt 问题',
    '',
    '-',
    '',
    '## 前端展示问题',
    '',
    '-',
    '',
    '## 后续修改建议',
    '',
    '-',
    ''
  ].join('\n');
}

function buildSamplesMarkdown(samples) {
  const lines = ['# 本轮测试样本', ''];
  for (const sample of samples) {
    lines.push(
      `## ${sample.sampleId} · ${sample.name}`,
      '',
      `- 来源：${sample.sourceType}`,
      `- 原文件名：${sample.originalFileName || '无'}`,
      `- 目标方向预期：${sample.targetFormatExpected}`,
      `- 材料形态预期：${sample.materialFormExpected}`,
      `- 预期诊断深度：${sample.expectedDiagnosisDepth}`,
      `- 字数：${sample.charCount}`,
      `- 测试重点：${sample.testFocus || '无'}`,
      `- 文本路径：${sample.textPath}`,
      ''
    );
  }
  return lines.join('\n');
}
