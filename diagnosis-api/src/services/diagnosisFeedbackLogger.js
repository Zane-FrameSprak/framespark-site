import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, '../..');
const FEEDBACK_DIR = path.join(API_ROOT, 'logs', 'diagnosis', 'review-queue', 'user-feedback');

const ALLOWED_FEEDBACK_TYPES = new Set(['understanding_wrong']);

const FEEDBACK_AREA_LABELS = {
  target_format_wrong: '目标方向不对',
  material_form_wrong: '材料形态不对',
  diagnosis_method_wrong: '诊断方式不对',
  core_understanding_wrong: '核心内容理解不准',
  problems_wrong: '报告问题不准',
  nextstep_wrong: '下一步判断不合理',
  other: '其他'
};

const TARGET_FORMAT_LABELS = {
  short: '短片',
  feature: '长片',
  unknown: '未明确'
};

const MATERIAL_FORM_LABELS = {
  concept: '故事概念',
  synopsis: '梗概',
  outline: '大纲',
  character_bio: '人物小传',
  worldbuilding: '世界观设定',
  fragment: '片段文本',
  full_script: '完整剧本',
  unknown: '未明确形态的创意材料'
};

const DIAGNOSIS_METHOD_LABELS = {
  short: '短片剧本诊断',
  feature: '长片剧本诊断',
  other: '创意材料诊断'
};

export function validateFeedbackPayload(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {};
  const feedbackType = String(payload.feedbackType || 'understanding_wrong').trim();
  if (!ALLOWED_FEEDBACK_TYPES.has(feedbackType)) {
    return {
      ok: false,
      code: 'INVALID_FEEDBACK_TYPE',
      message: '未支持的反馈类型，请稍后再试。'
    };
  }

  const areas = Array.isArray(payload.areas) ? payload.areas : [];
  const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (areas.length === 0 && !comment) {
    return {
      ok: false,
      code: 'FEEDBACK_EMPTY',
      message: '请至少勾选一项或填写补充说明。'
    };
  }

  return { ok: true };
}

export async function logDiagnosisFeedback(rawPayload) {
  const entry = buildFeedbackEntry(rawPayload);
  await fs.mkdir(FEEDBACK_DIR, { recursive: true });

  const jsonPath = path.join(FEEDBACK_DIR, `${entry.id}.json`);
  const mdPath = path.join(FEEDBACK_DIR, `${entry.id}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(entry, null, 2), 'utf8');
  await fs.writeFile(mdPath, buildFeedbackMarkdown(entry), 'utf8');

  return {
    id: entry.id,
    jsonPath: toRelativePath(jsonPath),
    mdPath: toRelativePath(mdPath),
    linkedDiagnosisLogPath: entry.linkedDiagnosisLogPath
  };
}

function buildFeedbackEntry(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {};
  const createdAt = new Date().toISOString();
  const id = makeId(createdAt);
  const diagnosisId = sanitizeString(payload.diagnosisId, 128);
  const feedbackType = sanitizeString(payload.feedbackType || 'understanding_wrong', 64);
  const areas = sanitizeAreas(payload.areas);
  const comment = sanitizeString(payload.comment, 2000);
  const materialRouting = sanitizeRouting(payload.materialRouting);
  const reportSummary = sanitizeString(payload.reportSummary, 600);
  const reportNextStep = sanitizeString(payload.reportNextStep, 400);

  return {
    id,
    createdAt,
    diagnosisId,
    feedbackType,
    areas,
    comment,
    materialRouting,
    reportSummary,
    reportNextStep,
    linkedDiagnosisLogPath: diagnosisId ? guessDiagnosisLogPath(diagnosisId) : ''
  };
}

function sanitizeAreas(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const key = sanitizeString(item, 64);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
      if (out.length >= 12) break;
    }
  }
  return out;
}

function sanitizeString(value, maxLen) {
  return String(value == null ? '' : value).trim().slice(0, maxLen);
}

function sanitizeRouting(routing) {
  if (!routing || typeof routing !== 'object') return null;
  return {
    userSelectedType: sanitizeString(routing.userSelectedType, 32),
    targetFormat: sanitizeString(routing.targetFormat, 32),
    materialForm: sanitizeString(routing.materialForm, 64),
    effectiveDiagnosisType: sanitizeString(routing.effectiveDiagnosisType, 32),
    classificationSource: sanitizeString(routing.classificationSource, 64),
    notice: sanitizeString(routing.notice, 400)
  };
}

function buildFeedbackMarkdown(entry) {
  const routing = entry.materialRouting || {};
  const areasZh = entry.areas.map(area => FEEDBACK_AREA_LABELS[area] || area);
  const lines = [
    `# 用户反馈：${entry.feedbackType}`,
    '',
    `反馈时间：${entry.createdAt}`,
    `反馈 ID：${entry.id}`,
    `诊断 ID：${entry.diagnosisId || '（未提供）'}`,
    `反馈类型：${entry.feedbackType}`,
    '',
    '## 用户选择的问题项',
    '',
    areasZh.length ? areasZh.map(a => `- ${a}`).join('\n') : '（未选择）',
    '',
    '## 用户补充说明',
    '',
    entry.comment || '（无）',
    '',
    '## 系统理解信息',
    '',
    `- 目标方向：${TARGET_FORMAT_LABELS[routing.targetFormat] || routing.targetFormat || '（未知）'}`,
    `- 材料形态：${MATERIAL_FORM_LABELS[routing.materialForm] || routing.materialForm || '（未知）'}`,
    `- 诊断方式：${DIAGNOSIS_METHOD_LABELS[routing.effectiveDiagnosisType] || routing.effectiveDiagnosisType || '（未知）'}`,
    `- 分类来源：${routing.classificationSource || '（未知）'}`,
    `- 材料识别说明：${routing.notice || '（无）'}`,
    '',
    '## 报告片段',
    '',
    `- summary：${entry.reportSummary || '（未提供）'}`,
    `- nextStep：${entry.reportNextStep || '（未提供）'}`,
    '',
    '## 关联诊断日志',
    '',
    entry.linkedDiagnosisLogPath
      ? `可能路径：${entry.linkedDiagnosisLogPath}（若日志已写入磁盘）`
      : '未提供 diagnosisId，无法关联诊断日志。',
    ''
  ];
  return lines.join('\n');
}

function guessDiagnosisLogPath(diagnosisId) {
  const match = String(diagnosisId).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  return `logs/diagnosis/by-date/${year}-${month}-${day}/${diagnosisId}.json`;
}

function makeId(createdAt) {
  const timestamp = createdAt.replace(/[-:.]/g, '').replace('T', '-').replace('Z', '');
  const random = Math.random().toString(36).slice(2, 8);
  return `fb-${timestamp}-${random}`;
}

function toRelativePath(fullPath) {
  return path.relative(API_ROOT, fullPath).split(path.sep).join('/');
}
