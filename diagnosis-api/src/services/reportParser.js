import { ApiError } from '../utils/errors.js';

const REQUIRED_FIELDS = ['summary', 'core', 'strengths', 'problems', 'suggestions', 'nextStep'];
const ARRAY_FIELDS = ['strengths', 'problems', 'suggestions'];

const BASIC_PREFIXES = {
  short:   ['建议继续打磨', '需要大改', '可进入进阶诊断'],
  feature: ['建议继续打磨', '需要大改', '可进入进阶诊断', '不适合按长片诊断'],
  other:   ['建议补充材料', '需要大改', '建议继续打磨', '可进入进阶诊断', '不适合按创意材料诊断']
};

const ADVANCED_PREFIXES = [
  '建议继续打磨',
  '需要结构性重写',
  '可进入下一阶段评估',
  '暂不适合继续深化',
  '需要重新开发',
  '建议补充材料'
];

const ALLOWED_PREFIXES = Object.fromEntries(
  Object.entries(BASIC_PREFIXES).map(([materialType, prefixes]) => [
    materialType,
    [...new Set([...prefixes, ...ADVANCED_PREFIXES])]
  ])
);

const ADVANCE_PREFIX = '可进入进阶诊断';
const ADVANCE_SYNONYM_PATTERNS = [
  /可进入(?:更深入|深入|进阶)(?:的)?(?:故事)?诊断/,
  /可以进入(?:更深入|深入|进阶)(?:的)?(?:故事)?诊断/,
  /建议进入(?:更深入|深入|进阶)(?:的)?(?:故事)?诊断/,
  /可以进行进阶评估/,
  /建议进行(?:更深入|深入)(?:的)?故事诊断/
];
const ADVANCE_NEGATIVE_PATTERNS = [
  /不建议.{0,12}进阶诊断/,
  /暂不.{0,12}进阶诊断/,
  /不能.{0,12}进阶诊断/,
  /不适合.{0,12}进阶诊断/,
  /尚不.{0,12}进阶诊断/,
  /还不能.{0,12}进阶诊断/,
  /需要先.{0,20}再.{0,8}进阶诊断/
];

// Three-strategy JSON extraction
export function extractJson(content) {
  if (!content) {
    throw new ApiError(502, 'AI_RESPONSE_INVALID', 'AI 返回内容为空。');
  }

  // Strategy 1: direct parse
  try {
    return JSON.parse(content);
  } catch (_) {}

  // Strategy 2: strip markdown fences then parse
  const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {}

  // Strategy 3: extract first balanced { ... } block
  const firstBrace = content.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < content.length; i++) {
      const ch = content[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(content.slice(firstBrace, i + 1)); } catch (_) { break; }
        }
      }
    }
  }

  throw new ApiError(502, 'AI_RESPONSE_INVALID', 'AI 返回格式无法解析。');
}

export function isCriticallyMissing(raw) {
  if (!raw || typeof raw !== 'object') return true;
  return !('summary' in raw) || !('nextStep' in raw);
}

export function normalizeReport(raw, materialType) {
  const warnings = [];

  // Validate and coerce array fields
  const arrayResult = {};
  for (const field of ARRAY_FIELDS) {
    const val = raw[field];
    if (Array.isArray(val)) {
      arrayResult[field] = val.map(item => String(item || '').trim()).filter(Boolean);
    } else if (typeof val === 'string' && val.trim()) {
      arrayResult[field] = [val.trim()];
      warnings.push(`字段 ${field} 为字符串，已强制转为单元素数组`);
    } else {
      arrayResult[field] = [];
      if (!(field in raw)) {
        warnings.push(`字段 ${field} 缺失，已填充空数组`);
      }
    }
  }

  const nextStepResult = normalizeNextStep(stringOrFallback(raw.nextStep, '建议继续补充材料并打磨文本。'));
  const nextStep = nextStepResult.value;
  if (nextStepResult.warning) {
    warnings.push(nextStepResult.warning);
  }

  // Validate nextStep prefix
  if (materialType) {
    const allowed = ALLOWED_PREFIXES[materialType] || [];
    const valid = allowed.some(prefix => nextStep.startsWith(prefix));
    if (!valid && allowed.length > 0) {
      warnings.push(`nextStep 前缀不在允许列表内（允许：${allowed.join(' / ')}）；实际：${nextStep.slice(0, 40)}`);
    }
  }

  const report = {
    summary: stringOrFallback(raw.summary, '已生成基础诊断。'),
    core: stringOrFallback(raw.core, '暂未形成故事核心判断。'),
    ...arrayResult,
    nextStep
  };

  if (warnings.length > 0) {
    report._warnings = warnings;
  }

  return report;
}

// Validate that all 6 required fields are present in raw parsed JSON
export function validateFields(raw) {
  const missing = REQUIRED_FIELDS.filter(f => !(f in raw));
  return missing;
}

function stringOrFallback(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

export function normalizeNextStep(nextStep) {
  const text = String(nextStep || '').trim();
  if (!text) {
    return { value: text, warning: '' };
  }
  if (text.startsWith(ADVANCE_PREFIX)) {
    return { value: text, warning: '' };
  }
  if (ADVANCE_NEGATIVE_PATTERNS.some(pattern => pattern.test(text))) {
    return { value: text, warning: '' };
  }
  if (!ADVANCE_SYNONYM_PATTERNS.some(pattern => pattern.test(text))) {
    return { value: text, warning: '' };
  }

  return {
    value: `${ADVANCE_PREFIX}：${stripLeadingPunctuation(text)}`,
    warning: `nextStep 已规范化为「${ADVANCE_PREFIX}」前缀；原始值：${text.slice(0, 60)}`
  };
}

function stripLeadingPunctuation(text) {
  return text.replace(/^[：:，,。.、\s]+/, '');
}
