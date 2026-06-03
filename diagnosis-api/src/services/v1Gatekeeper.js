import { REPORT_V1_SCHEMA_VERSION } from './reportV1Schema.js';

const DEFAULT_MIN_TEXT_CHARS = 80;

const NON_STORY_PATTERNS = [
  /合同/,
  /发票/,
  /简历/,
  /劳动关系/,
  /接口文档/,
  /技术说明/,
  /API\s*文档/i,
  /财务报表/,
  /会议纪要/
];

const STORY_HINT_PATTERNS = [
  /故事/,
  /人物/,
  /角色/,
  /主角/,
  /冲突/,
  /秘密/,
  /发现/,
  /决定/,
  /离开/,
  /寻找/,
  /真相/,
  /剧本/,
  /场景/,
  /对白/,
  /电影/,
  /短片/,
  /长片/,
  /项目/
];

export function evaluateV1Gatekeeper(input = {}) {
  const text = normalizeText(input.text);
  const materialHint = normalizeMaterialHint(input.materialHint || input.metadata || {});
  const minTextChars = Number.isFinite(input.minTextChars) ? input.minTextChars : DEFAULT_MIN_TEXT_CHARS;

  if (!text) {
    return buildD0Result({
      code: 'LOW_INFORMATION',
      message: '材料为空，当前不适合故事开发诊断。',
      materialSummary: '未读取到可诊断文本。',
      suggestions: ['请补充故事概念、人物、情节或项目说明。']
    });
  }

  if (text.length < minTextChars) {
    return buildD0Result({
      code: 'TOO_SHORT',
      message: '材料信息过少，当前不适合故事开发诊断。',
      materialSummary: `当前文本约 ${text.length} 字，尚不足以判断故事开发状态。`,
      suggestions: ['请补充主角、目标、冲突、关键情节或项目背景。']
    });
  }

  if (materialHint.material_type === 'non_story_material' || materialHint.primary_material_type === 'non_story_material') {
    return buildD0Result({
      code: 'NON_STORY_MATERIAL',
      message: '当前材料不适合故事开发诊断。',
      materialSummary: '材料预分类为非故事或非影视项目开发材料。',
      suggestions: ['请提交故事梗概、剧本、小说叙事、人物设定或项目策划材料。']
    });
  }

  if (looksNonStory(text) && !hasStoryHint(text)) {
    return buildD0Result({
      code: 'NON_STORY_MATERIAL',
      message: '当前材料不适合故事开发诊断。',
      materialSummary: '文本更接近合同、简历、技术说明或其他非故事材料。',
      suggestions: ['请换成故事或影视项目开发相关材料后再诊断。']
    });
  }

  return {
    decision: 'allow_basic',
    stage: 'gatekeeper',
    nextStage: 'basic',
    reportV1: null,
    diagnostics: {
      source: 'v1-gatekeeper',
      usesAi: false,
      textLength: text.length,
      materialHint
    }
  };
}

function buildD0Result({ code, message, materialSummary, suggestions }) {
  return {
    decision: 'stop_d0',
    stage: 'D0',
    nextStage: null,
    reportV1: {
      schemaVersion: REPORT_V1_SCHEMA_VERSION,
      stage: 'D0',
      material_type: 'non_story_material',
      primary_material_type: 'non_story_material',
      secondary_material_types: [],
      is_mixed_material: false,
      material_components: [],
      maturity_level: 'D0',
      material_summary: materialSummary,
      story_core: '',
      strengths: [],
      main_problems: [message],
      priority_revisions: suggestions,
      next_step: '建议补充故事信息后再诊断。',
      conversion_advice: {
        status: 'not_applicable',
        message: '当前阶段不适合项目转化判断。'
      },
      rejection_reason: {
        code,
        message
      },
      suggestions,
      nextStep: '建议补充故事信息后再诊断。'
    },
    diagnostics: {
      source: 'v1-gatekeeper',
      usesAi: false,
      rejectionCode: code
    }
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeMaterialHint(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return {
    material_type: normalizeString(value.material_type || value.materialType),
    primary_material_type: normalizeString(value.primary_material_type || value.primaryMaterialType),
    pageType: normalizeString(value.pageType),
    confidence: value.confidence
  };
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function looksNonStory(text) {
  return NON_STORY_PATTERNS.some((pattern) => pattern.test(text));
}

function hasStoryHint(text) {
  return STORY_HINT_PATTERNS.some((pattern) => pattern.test(text));
}

