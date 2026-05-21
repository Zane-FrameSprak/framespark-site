import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { diagnosisVersions } from '../config/diagnosisVersion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, '../..');
const LOG_ROOT = path.join(API_ROOT, 'logs', 'diagnosis');
const INDEX_PATH = path.join(LOG_ROOT, 'index.json');
const REVIEW_QUEUES = {
  'high-potential': '高潜项目',
  boundary: '边界样本',
  warning: '异常警告'
};
const REVIEW_DIRS = ['high-potential', 'boundary', 'warning', 'error'];

export async function logDiagnosisResult({ mode, materialType, materialRouting, inputMode, parsed, stats, result }) {
  try {
    const entry = buildLogEntry({ mode, materialType, materialRouting, inputMode, parsed, stats, result });
    const logPath = await writeLogEntry(entry);
    await updateIndex(entry, logPath);
    await writeReviewSummaries(entry, logPath);
    return entry;
  } catch (err) {
    console.warn('[diagnosis-logger] failed to write diagnosis log:', err.message);
    return null;
  }
}

function buildLogEntry({ mode, materialType, materialRouting, inputMode, parsed, stats, result }) {
  const createdAt = new Date().toISOString();
  const id = makeId(createdAt);
  const basicReport = result.basicReport || null;
  const advancedReport = result.internalStage === 'advanced' ? result.finalReport : null;
  const finalReport = result.finalReport || null;
  const warnings = collectWarnings([basicReport, advancedReport, finalReport]);
  const basicNextStep = getNextStep(basicReport);
  const advancedNextStep = getNextStep(advancedReport);
  const finalNextStep = getNextStep(finalReport);
  const tags = buildTags({
    mode,
    internalStage: result.internalStage,
    warnings,
    finalNextStep
  });

  return {
    id,
    createdAt,
    materialType,
    inputMode: normalizeInputMode(inputMode),
    materialRouting: normalizeMaterialRouting(materialRouting, materialType),
    originalFileName: parsed.source?.filename || '',
    charCount: stats.charCount || 0,
    internalStage: result.internalStage,
    mode,
    hasAdvancedReport: Boolean(advancedReport),
    basicNextStep,
    advancedNextStep,
    finalNextStep,
    warnings,
    tags,
    model: mode === 'ai' ? config.deepseekModel : null,
    versions: buildVersions(mode),
    finalReport,
    basicReportSummary: summarizeReport(basicReport),
    advancedReportSummary: advancedReport ? summarizeReport(advancedReport) : null
  };
}

function buildVersions(mode) {
  return {
    ...diagnosisVersions,
    modelId: mode === 'ai' ? config.deepseekModel : 'mock'
  };
}

function normalizeInputMode(inputMode) {
  return inputMode === 'pasted_text' ? 'pasted_text' : 'file_upload';
}

async function writeLogEntry(entry) {
  const date = entry.createdAt.slice(0, 10);
  const dir = path.join(LOG_ROOT, 'by-date', date);
  const filename = `${entry.id}.json`;
  const fullPath = path.join(dir, filename);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(entry, null, 2), 'utf8');
  return toLogRelativePath(fullPath);
}

async function updateIndex(entry, logPath) {
  await fs.mkdir(LOG_ROOT, { recursive: true });
  const index = await readIndex();
  const record = {
    id: entry.id,
    createdAt: entry.createdAt,
    materialType: entry.materialType,
    originalFileName: entry.originalFileName,
    charCount: entry.charCount,
    internalStage: entry.internalStage,
    finalNextStep: entry.finalNextStep,
    tags: entry.tags,
    logPath
  };
  const nextIndex = [record, ...index.filter(item => item.id !== entry.id)];
  await fs.writeFile(INDEX_PATH, JSON.stringify(nextIndex, null, 2), 'utf8');
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeReviewSummaries(entry, logPath) {
  await Promise.all(
    REVIEW_DIRS.map(name => fs.mkdir(path.join(LOG_ROOT, 'review-queue', name), { recursive: true }))
  );

  const summaryTags = entry.tags.filter(tag => tag in REVIEW_QUEUES);
  await Promise.all(summaryTags.map(tag => writeReviewSummary(entry, logPath, tag)));
}

async function writeReviewSummary(entry, logPath, tag) {
  const dir = path.join(LOG_ROOT, 'review-queue', tag);
  const fullPath = path.join(dir, `${entry.id}.md`);
  const lines = [
    `# ${entry.originalFileName || entry.id}`,
    '',
    `createdAt: ${entry.createdAt}`,
    `materialType: ${entry.materialType}`,
    `internalStage: ${entry.internalStage}`,
    `finalNextStep: ${entry.finalNextStep || '无'}`,
    '',
    `分类原因：${getReviewReason(tag)}`,
    '',
    `原始 JSON 日志路径：${logPath}`,
    ''
  ];
  await fs.writeFile(fullPath, lines.join('\n'), 'utf8');
}

function buildTags({ mode, internalStage, warnings, finalNextStep }) {
  const tags = [];
  const nextStep = String(finalNextStep || '');

  if (internalStage === 'basic') tags.push('basic-stop');
  if (internalStage === 'advanced') tags.push('advanced');
  if (nextStep.startsWith('可进入下一阶段评估')) tags.push('high-potential');
  if (
    nextStep.includes('需要大改') ||
    nextStep.includes('需要结构性重写') ||
    nextStep.includes('需要重新开发')
  ) {
    tags.push('needs-rewrite');
  }
  if (nextStep.includes('建议补充材料')) tags.push('supplement');
  if (warnings.length > 0) tags.push('warning');
  if (nextStep.includes('建议继续打磨')) tags.push('boundary');
  if (mode === 'mock') tags.push('mock');

  return tags;
}

function collectWarnings(reports) {
  const warnings = [];
  for (const report of reports) {
    if (Array.isArray(report?._warnings)) {
      warnings.push(...report._warnings.map(item => String(item || '').trim()).filter(Boolean));
    }
  }
  return [...new Set(warnings)];
}

function summarizeReport(report) {
  if (!report) return null;
  return {
    summary: String(report.summary || '').trim(),
    nextStep: getNextStep(report)
  };
}

function getNextStep(report) {
  return String(report?.nextStep || '').trim();
}

function makeId(createdAt) {
  const timestamp = createdAt.replace(/[-:.]/g, '').replace('T', '-').replace('Z', '');
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

function toLogRelativePath(fullPath) {
  return path.relative(API_ROOT, fullPath).split(path.sep).join('/');
}

function getReviewReason(tag) {
  const reasons = {
    'high-potential': 'finalNextStep 以「可进入下一阶段评估」开头。',
    boundary: 'finalNextStep 包含「建议继续打磨」，适合作为边界样本复查。',
    warning: '诊断报告包含 parser 或格式 warning。'
  };
  return reasons[tag] || REVIEW_QUEUES[tag] || tag;
}

function normalizeMaterialRouting(materialRouting, materialType) {
  if (!materialRouting || typeof materialRouting !== 'object') {
    return {
      userSelectedType: materialType,
      targetFormat: materialType === 'short' || materialType === 'feature' ? materialType : 'unknown',
      materialForm: 'unknown',
      effectiveDiagnosisType: materialType,
      reason: '',
      notice: '',
      classificationSource: 'local',
      localMaterialForm: 'unknown',
      aiMaterialForm: null,
      classificationReason: ''
    };
  }

  return {
    userSelectedType: materialRouting.userSelectedType || 'other',
    targetFormat: materialRouting.targetFormat || 'unknown',
    materialForm: materialRouting.materialForm || 'unknown',
    effectiveDiagnosisType: materialRouting.effectiveDiagnosisType || materialType || 'other',
    reason: materialRouting.reason || '',
    notice: materialRouting.notice || '',
    classificationSource: materialRouting.classificationSource || 'local',
    localMaterialForm: materialRouting.localMaterialForm || materialRouting.materialForm || 'unknown',
    aiMaterialForm: materialRouting.aiMaterialForm || null,
    classificationReason: materialRouting.classificationReason || materialRouting.reason || ''
  };
}
