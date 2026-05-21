import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');
const DEFAULT_LOG_ROOT = path.join(API_ROOT, 'logs', 'diagnosis');
const DEFAULT_LIMIT = 20;
const REVIEW_TYPES = new Set(['warning', 'boundary', 'feedback']);

export async function loadReviewQueue(options = {}) {
  const logRoot = options.logRoot || DEFAULT_LOG_ROOT;
  const type = normalizeType(options.type);
  const limit = normalizeLimit(options.limit);
  const records = [];

  if (!type || type === 'warning') {
    records.push(...await readDiagnosisQueue(logRoot, 'warning'));
  }
  if (!type || type === 'boundary') {
    records.push(...await readDiagnosisQueue(logRoot, 'boundary'));
  }
  if (!type || type === 'feedback') {
    records.push(...await readFeedbackQueue(logRoot));
  }

  return records
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, limit);
}

export function formatRecords(records, options = {}) {
  if (options.json) {
    return `${JSON.stringify(records, null, 2)}\n`;
  }

  if (records.length === 0) {
    return '暂无待复查记录。\n';
  }

  return records.map(record => [
    `${record.createdAt || '-'}`,
    `type=${record.type}`,
    `diagnosisId=${record.diagnosisId || '-'}`,
    `target=${record.targetFormat || '-'}`,
    `form=${record.materialForm || '-'}`,
    `depth=${record.diagnosisDepth || '-'}`,
    `summary=${truncate(record.summary, 100) || '-'}`,
    `reason=${truncate(record.reason, 100) || '-'}`,
    `path=${record.filePath || '-'}`
  ].join(' | ')).join('\n') + '\n';
}

export function parseArgs(argv) {
  const options = {
    limit: DEFAULT_LIMIT,
    type: '',
    json: false,
    logRoot: DEFAULT_LOG_ROOT
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit' && argv[i + 1]) {
      options.limit = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--limit=')) {
      options.limit = arg.slice('--limit='.length);
    } else if (arg === '--type' && argv[i + 1]) {
      options.type = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--type=')) {
      options.type = arg.slice('--type='.length);
    } else if (arg === '--log-root' && argv[i + 1]) {
      options.logRoot = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--log-root=')) {
      options.logRoot = path.resolve(arg.slice('--log-root='.length));
    }
  }

  return {
    ...options,
    limit: normalizeLimit(options.limit),
    type: normalizeType(options.type)
  };
}

async function readDiagnosisQueue(logRoot, type) {
  const dir = path.join(logRoot, 'review-queue', type);
  const files = await listFiles(dir, '.md');
  const records = [];

  for (const file of files) {
    const summary = await readReviewSummary(file);
    const linkedLog = summary.logPath ? path.join(API_ROOT, summary.logPath) : '';
    const entry = linkedLog ? await readJson(linkedLog) : null;
    records.push(buildDiagnosisQueueRecord({ type, summary, entry, file }));
  }

  return records;
}

async function readFeedbackQueue(logRoot) {
  const dir = path.join(logRoot, 'review-queue', 'user-feedback');
  const files = await listFiles(dir, '.json');
  const records = [];

  for (const file of files) {
    const entry = await readJson(file);
    if (!entry) continue;
    records.push(buildFeedbackRecord(entry, file));
  }

  return records;
}

function buildDiagnosisQueueRecord({ type, summary, entry, file }) {
  const routing = entry?.materialRouting || {};
  return {
    type,
    createdAt: entry?.createdAt || summary.createdAt || '',
    diagnosisId: entry?.id || extractDiagnosisId(summary.logPath) || '',
    targetFormat: routing.targetFormat || '',
    materialForm: routing.materialForm || '',
    diagnosisDepth: entry?.diagnosisDepth || (entry?.internalStage === 'advanced' ? 'advanced' : entry?.internalStage === 'basic' ? 'basic' : ''),
    summary: entry?.finalReport?.summary || entry?.basicReportSummary?.summary || '',
    reason: type === 'warning'
      ? summarizeArray(entry?.warnings) || summary.reason
      : entry?.finalNextStep || summary.finalNextStep || summary.reason,
    filePath: toDisplayPath(file)
  };
}

function buildFeedbackRecord(entry, file) {
  const routing = entry.materialRouting || {};
  return {
    type: 'feedback',
    createdAt: entry.createdAt || '',
    diagnosisId: entry.diagnosisId || '',
    targetFormat: routing.targetFormat || '',
    materialForm: routing.materialForm || '',
    diagnosisDepth: entry.diagnosisDepth || '',
    summary: entry.reportSummary || '',
    reason: summarizeArray(entry.areas) || entry.comment || entry.feedbackType || '',
    filePath: toDisplayPath(file)
  };
}

async function readReviewSummary(file) {
  const raw = await fs.readFile(file, 'utf8');
  return {
    createdAt: extractLineValue(raw, 'createdAt'),
    finalNextStep: extractLineValue(raw, 'finalNextStep'),
    reason: extractLineValue(raw, '分类原因'),
    logPath: extractLineValue(raw, '原始 JSON 日志路径')
  };
}

function extractLineValue(raw, key) {
  const line = raw.split('\n').find(item => item.startsWith(`${key}:`) || item.startsWith(`${key}：`));
  if (!line) return '';
  return line.slice(line.indexOf(line.includes('：') ? '：' : ':') + 1).trim();
}

async function listFiles(dir, ext) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith(ext))
      .map(entry => path.join(dir, entry.name));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function extractDiagnosisId(logPath) {
  return path.basename(String(logPath || ''), '.json');
}

function summarizeArray(value) {
  return Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean).join('; ') : '';
}

function truncate(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeLimit(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_LIMIT;
}

function normalizeType(value) {
  const type = String(value || '').trim();
  return REVIEW_TYPES.has(type) ? type : '';
}

function toDisplayPath(file) {
  return path.relative(API_ROOT, file).split(path.sep).join('/');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const records = await loadReviewQueue(options);
  process.stdout.write(formatRecords(records, options));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(`读取 review queue 失败：${err.message}`);
    process.exit(1);
  });
}
