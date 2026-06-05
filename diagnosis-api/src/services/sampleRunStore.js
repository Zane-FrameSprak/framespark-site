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
  await writeJson(path.join(runDir, 'results-index.json'), []);
  await fs.writeFile(path.join(runDir, 'run-notes.md'), buildRunNotes(meta), 'utf8');
  await fs.writeFile(path.join(runDir, 'review-notes.md'), buildReviewNotes(), 'utf8');

  return readSampleRun(runId, { root });
}

export async function readSampleRun(runId, { root = SAMPLE_ROOT } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const runDir = getRunDir(root, safeRunId);
  const meta = await readJson(path.join(runDir, 'run-meta.json'), null);
  const samples = await readJson(path.join(runDir, 'samples-index.json'), []);
  const results = await readJson(path.join(runDir, 'results-index.json'), []);
  if (!meta) {
    return {
      runId: safeRunId,
      createdAt: '',
      sameStory: false,
      storyName: '',
      storyRelation: '',
      notes: '',
      source: '',
      samples: Array.isArray(samples) ? samples : [],
      results: Array.isArray(results) ? results : []
    };
  }
  return {
    ...meta,
    samples: Array.isArray(samples) ? samples : [],
    results: Array.isArray(results) ? results : []
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
      fileType: sample.fileType,
      extractedTextLength: sample.extractedTextLength,
      textQualityStatus: sample.textQualityStatus,
      textQualityWarnings: sample.textQualityWarnings,
      textQualityMetrics: sample.textQualityMetrics,
      targetFormatExpected: sample.targetFormatExpected,
      materialFormExpected: sample.materialFormExpected,
      expectedDiagnosisDepth: sample.expectedDiagnosisDepth,
      testFocus: sample.testFocus,
      charCount: sample.text.length,
      samplePath: relativePath,
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

export async function readSampleText(runId, sampleId, { root = SAMPLE_ROOT } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const safeSampleId = sanitizeText(sampleId, 120);
  const runDir = getRunDir(root, safeRunId);
  await ensureRunExists(runDir);
  const samples = await readJson(path.join(runDir, 'samples-index.json'), []);
  const sample = Array.isArray(samples) ? samples.find(item => item.sampleId === safeSampleId) : null;
  if (!sample) {
    throw new ApiError(404, 'SAMPLE_NOT_FOUND', '测试样本不存在。');
  }
  const relativePath = assertSafeRelativePath(sample.textPath || sample.samplePath);
  const text = await fs.readFile(path.join(runDir, relativePath), 'utf8');
  return { sample, text };
}

export async function appendDiagnosisResults(runId, rawResults = [], { root = SAMPLE_ROOT, now = new Date() } = {}) {
  const safeRunId = assertSafeRunId(runId);
  const runDir = getRunDir(root, safeRunId);
  await ensureRunExists(runDir);
  const resultDir = path.join(runDir, 'results');
  await fs.mkdir(resultDir, { recursive: true });

  const results = Array.isArray(rawResults) ? rawResults : [];
  if (!results.length) {
    return { runId: safeRunId, savedCount: 0, results: await readResultsIndex(runDir) };
  }

  const indexPath = path.join(runDir, 'results-index.json');
  const currentIndex = await readResultsIndex(runDir);
  const nextIndex = [...currentIndex];
  const saved = [];

  for (const raw of results) {
    const result = normalizeDiagnosisResult(raw, now);
    const filename = `${result.resultId}-${slugify(result.sampleName || result.sampleId || 'diagnosis-result') || 'diagnosis-result'}.json`;
    const relativePath = `results/${filename}`;
    const fullRecord = {
      ...result,
      resultPath: relativePath
    };
    await writeJson(path.join(runDir, relativePath), fullRecord);
    const indexRecord = buildResultIndexRecord(fullRecord);
    nextIndex.unshift(indexRecord);
    saved.push(indexRecord);
  }

  await writeJson(indexPath, nextIndex);
  await fs.writeFile(path.join(runDir, 'results.md'), buildResultsMarkdown(nextIndex), 'utf8');

  return {
    runId: safeRunId,
    savedCount: saved.length,
    saved,
    results: nextIndex
  };
}

async function readResultsIndex(runDir) {
  const value = await readJson(path.join(runDir, 'results-index.json'), []);
  return Array.isArray(value) ? value : [];
}

function normalizeDiagnosisResult(raw, now) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const createdAt = input.createdAt || now.toISOString();
  const resultId = slugify(input.resultId) || `result-${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7)}`;
  const v1Summary = normalizeV1Summary(input);
  return {
    resultId,
    sampleId: sanitizeText(input.sampleId, 120),
    sampleName: sanitizeText(input.sampleName, 160),
    createdAt,
    mode: sanitizeText(input.mode, 32),
    materialType: sanitizeText(input.materialType, 32),
    targetFormat: sanitizeText(input.targetFormat, 32),
    materialForm: sanitizeText(input.materialForm, 64),
    effectiveDiagnosisType: sanitizeText(input.effectiveDiagnosisType, 32),
    diagnosisDepth: sanitizeText(input.diagnosisDepth, 32),
    diagnosisId: sanitizeText(input.diagnosisId, 120),
    summary: sanitizeText(input.summary, 2000),
    core: sanitizeText(input.core, 3000),
    nextStep: sanitizeText(input.nextStep, 2000),
    ...v1Summary,
    report: input.report && typeof input.report === 'object' ? input.report : null,
    materialRouting: input.materialRouting && typeof input.materialRouting === 'object' ? input.materialRouting : null,
    stats: input.stats && typeof input.stats === 'object' ? input.stats : null,
    source: input.source && typeof input.source === 'object' ? input.source : null
  };
}

function buildResultIndexRecord(result) {
  return {
    resultId: result.resultId,
    sampleId: result.sampleId,
    sampleName: result.sampleName,
    createdAt: result.createdAt,
    mode: result.mode,
    materialType: result.materialType,
    targetFormat: result.targetFormat,
    materialForm: result.materialForm,
    effectiveDiagnosisType: result.effectiveDiagnosisType,
    diagnosisDepth: result.diagnosisDepth,
    diagnosisId: result.diagnosisId,
    summary: result.summary,
    core: result.core,
    nextStep: result.nextStep,
    hasReportV1: result.hasReportV1,
    v1StageReached: result.v1StageReached,
    v1Decision: result.v1Decision,
    v1PromptVersion: result.v1PromptVersion,
    v1Model: result.v1Model,
    v1Fallback: result.v1Fallback,
    v1LatencyMs: result.v1LatencyMs,
    v1MaturityLevel: result.v1MaturityLevel,
    v1Stage: result.v1Stage,
    v1NextStep: result.v1NextStep,
    v1StopReason: result.v1StopReason,
    v1StageStatus: result.v1StageStatus,
    resultPath: result.resultPath
  };
}

function normalizeV1Summary(input) {
  const reportV1 = input.reportV1 && typeof input.reportV1 === 'object' ? input.reportV1 : null;
  const diagnostics = {
    ...(reportV1?.diagnostics && typeof reportV1.diagnostics === 'object' ? reportV1.diagnostics : {}),
    ...(input.diagnostics && typeof input.diagnostics === 'object' ? input.diagnostics : {})
  };
  const nextStep = reportV1?.next_step && typeof reportV1.next_step === 'object' ? reportV1.next_step : null;
  const rejection = reportV1?.rejection_reason && typeof reportV1.rejection_reason === 'object' ? reportV1.rejection_reason : null;

  return {
    hasReportV1: Boolean(input.hasReportV1 || reportV1),
    v1StageReached: sanitizeText(input.v1StageReached || diagnostics.stageReached || reportV1?.stage, 64),
    v1Decision: sanitizeText(
      input.v1Decision
      || diagnostics.decision
      || diagnostics.stageDecisionHints?.recommendedAction
      || reportV1?.stageDecisionHints?.recommendedAction,
      120
    ),
    v1PromptVersion: sanitizeText(input.v1PromptVersion || diagnostics.promptVersion, 120),
    v1Model: sanitizeText(input.v1Model || diagnostics.model, 120),
    v1Fallback: input.v1Fallback === true || diagnostics.fallback === true,
    v1LatencyMs: readOptionalNumber(input.v1LatencyMs ?? diagnostics.latencyMs),
    v1MaturityLevel: sanitizeText(input.v1MaturityLevel || reportV1?.maturity_level, 64),
    v1Stage: sanitizeText(input.v1Stage || reportV1?.stage, 64),
    v1NextStep: sanitizeText(input.v1NextStep || nextStep?.summary || nextStep?.action || nextStep?.label || reportV1?.nextStep, 500),
    v1StopReason: sanitizeText(input.v1StopReason || diagnostics.stopReason || rejection?.message || rejection?.code, 500),
    v1StageStatus: normalizeV1StageStatus(input.v1StageStatus || diagnostics.stageStatus || reportV1?.stageStatus, diagnostics, reportV1)
  };
}

function normalizeV1StageStatus(value, diagnostics, reportV1) {
  if (value && typeof value === 'object') {
    return {
      basic: sanitizeText(value.basic, 64),
      advanced: sanitizeText(value.advanced, 64),
      final: sanitizeText(value.final, 64)
    };
  }
  const reached = sanitizeText(diagnostics.stageReached || reportV1?.stage, 64);
  return {
    basic: reached === 'basic' ? 'reached' : '',
    advanced: reached === 'advanced' ? 'reached' : '',
    final: reached === 'final' ? 'reached' : ''
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
    fileType: sanitizeText(sample.fileType, 32) || 'pasted_text',
    extractedTextLength: readTextLength(sample.extractedTextLength, text.length),
    textQualityStatus: normalizeQualityStatus(sample.textQualityStatus),
    textQualityWarnings: normalizeStringArray(sample.textQualityWarnings, 10, 200),
    textQualityMetrics: normalizeQualityMetrics(sample.textQualityMetrics),
    targetFormatExpected,
    materialFormExpected,
    expectedDiagnosisDepth,
    testFocus: sanitizeText(sample.testFocus, 1000),
    text
  };
}

function normalizeQualityStatus(value) {
  const text = String(value || '').trim();
  return ['ok', 'warning', 'failed'].includes(text) ? text : 'ok';
}

function normalizeStringArray(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => sanitizeText(item, maxLen)).filter(Boolean);
}

function normalizeQualityMetrics(value) {
  const metrics = value && typeof value === 'object' ? value : {};
  return {
    charCount: readTextLength(metrics.charCount, 0),
    chineseCharRatio: readRatio(metrics.chineseCharRatio),
    latinCharRatio: readRatio(metrics.latinCharRatio),
    punctuationRatio: readRatio(metrics.punctuationRatio),
    lineCount: readTextLength(metrics.lineCount, 0),
    shortLineRatio: readRatio(metrics.shortLineRatio)
  };
}

function readRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 1) return 1;
  return Math.round(number * 1000) / 1000;
}

function readTextLength(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function readOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
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

function assertSafeRelativePath(value) {
  const relativePath = String(value || '').trim();
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\0')) {
    throw new ApiError(400, 'INVALID_SAMPLE_PATH', '样本文本路径不合法。');
  }
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith('..') || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new ApiError(400, 'INVALID_SAMPLE_PATH', '样本文本路径不合法。');
  }
  if (!normalized.startsWith(`samples${path.sep}`) && !normalized.startsWith('samples/')) {
    throw new ApiError(400, 'INVALID_SAMPLE_PATH', '样本文本路径不合法。');
  }
  return normalized;
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
      `- 文件类型：${sample.fileType || 'unknown'}`,
      `- 提取文本长度：${sample.extractedTextLength ?? sample.charCount}`,
      `- 文本质量：${sample.textQualityStatus || 'ok'}`,
      `- 文本质量提示：${(sample.textQualityWarnings || []).join('；') || '无'}`,
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

function buildResultsMarkdown(results) {
  const lines = ['# 本轮诊断测试结果', ''];
  for (const result of results) {
    lines.push(
      `## ${result.sampleId} · ${result.sampleName || result.resultId}`,
      '',
      `- resultId：${result.resultId}`,
      `- createdAt：${result.createdAt}`,
      `- mode：${result.mode}`,
      `- targetFormat：${result.targetFormat}`,
      `- materialForm：${result.materialForm}`,
      `- diagnosisDepth：${result.diagnosisDepth}`,
      `- diagnosisId：${result.diagnosisId || '无'}`,
      `- hasReportV1：${result.hasReportV1 ? 'true' : 'false'}`,
      `- v1StageReached：${result.v1StageReached || '无'}`,
      `- v1Decision：${result.v1Decision || '无'}`,
      `- v1PromptVersion：${result.v1PromptVersion || '无'}`,
      `- v1Model：${result.v1Model || '无'}`,
      `- v1Fallback：${result.v1Fallback ? 'true' : 'false'}`,
      `- 结果路径：${result.resultPath}`,
      '',
      '### summary',
      '',
      result.summary || '（无）',
      '',
      '### core',
      '',
      result.core || '（无）',
      '',
      '### nextStep',
      '',
      result.nextStep || '（无）',
      ''
    );
  }
  return lines.join('\n');
}
