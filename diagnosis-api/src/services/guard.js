import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

const MIN_CHARS_BY_FORM = {
  full_script: 800,
  outline: 300,
  synopsis: 300,
  concept: 80,
  character_bio: 200,
  worldbuilding: 200,
  fragment: 300,
  unknown: 300
};

export function validateScriptText(text, materialRoutingOrType, options = {}) {
  const stats = getTextStats(text);
  const materialRouting = normalizeMaterialRouting(materialRoutingOrType);
  const minimumChars = MIN_CHARS_BY_FORM[materialRouting.materialForm] || config.minTextChars;

  if (!stats.charCount) {
    throw new ApiError(400, 'FILE_EMPTY', '文件内容为空，请上传可读取的剧本或故事材料。');
  }

  if (!options.allowD0 && (materialRouting.materialForm === 'reject' || materialRouting.effectiveDiagnosisType === 'reject')) {
    throw new ApiError(
      400,
      'MATERIAL_REJECTED',
      materialRouting.reason || '当前材料不适合按影视创意材料诊断。'
    );
  }

  if (!options.allowD0 && stats.charCount < minimumChars) {
    throw new ApiError(
      400,
      'FILE_TOO_SHORT',
      `当前文本约 ${stats.charCount} 字，低于 ${getMaterialFormLabel(materialRouting.materialForm)} 的最低有效字数 ${minimumChars}，暂时无法形成有效诊断。`
    );
  }

  return {
    materialType: materialRouting.effectiveDiagnosisType,
    materialRouting,
    stats
  };
}

function getTextStats(text) {
  const withoutWhitespace = text.replace(/\s/g, '');
  const lines = text.split('\n').filter((line) => line.trim());

  return {
    charCount: withoutWhitespace.length,
    lineCount: lines.length
  };
}

function normalizeMaterialRouting(value) {
  if (value && typeof value === 'object') {
    return {
      materialForm: value.materialForm || 'unknown',
      effectiveDiagnosisType: value.effectiveDiagnosisType || value.materialType || 'other',
      reason: value.reason || ''
    };
  }
  return {
    materialForm: 'full_script',
    effectiveDiagnosisType: value || 'other',
    reason: ''
  };
}

function getMaterialFormLabel(materialForm) {
  const labels = {
    full_script: '完整剧本',
    outline: '大纲',
    synopsis: '梗概',
    concept: '概念',
    character_bio: '人物小传',
    worldbuilding: '世界观设定',
    fragment: '片段文本',
    unknown: '创意材料'
  };
  return labels[materialForm] || '创意材料';
}
