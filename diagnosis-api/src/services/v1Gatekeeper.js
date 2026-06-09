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

const LOW_MATURITY_NEXT_STEP = '请先补充：主角是谁、主角想要什么、主要阻碍是什么、至少三个关键事件，以及结尾或状态变化方向。';

const LOW_MATURITY_SUGGESTIONS = [
  '明确主角或叙事承载者。',
  '补充主角的目标、压力或主要阻碍。',
  '补出至少三个关键事件，形成基本事件链。',
  '写清结尾或人物状态变化方向。'
];

const PROTAGONIST_PATTERNS = [/主角/, /主人公/, /少年/, /女孩/, /男孩/, /老人/, /导演/, /邮差/, /调度员/, /外卖员/, /小学生/];
const GOAL_PATTERNS = [/想要/, /为了/, /必须/, /决定/, /寻找/, /试图/, /逃出/, /完成/, /救/];
const CONFLICT_PATTERNS = [/冲突/, /阻碍/, /危机/, /陷阱/, /秘密/, /感染/, /规则/, /追捕/, /惩罚/, /争议/];
const EVENT_PATTERNS = [/发现/, /遇到/, /找到/, /烧/, /离开/, /回到/, /送/, /调查/, /公开/, /接受/];
const OUTCOME_PATTERNS = [/最终/, /最后/, /结尾/, /结果/, /变化/, /离开/, /开启/, /重新/];

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

  const lowMaturity = analyzeLowMaturity(text, materialHint);
  if (lowMaturity.isLowMaturity) {
    return buildD0Result({
      code: 'LOW_INFORMATION',
      message: '材料仍停留在概念或设定碎片阶段，当前不适合进入基础诊断。',
      materialSummary: lowMaturity.materialSummary,
      suggestions: LOW_MATURITY_SUGGESTIONS,
      nextStep: LOW_MATURITY_NEXT_STEP,
      materialType: 'idea_concept',
      diagnostics: {
        maturityReason: lowMaturity.reason,
        maturitySignals: lowMaturity.signals
      }
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

function buildD0Result({
  code,
  message,
  materialSummary,
  suggestions,
  nextStep = '建议补充故事信息后再诊断。',
  materialType = 'non_story_material',
  diagnostics = {}
}) {
  return {
    decision: 'stop_d0',
    stage: 'D0',
    nextStage: null,
    reportV1: {
      schemaVersion: REPORT_V1_SCHEMA_VERSION,
      stage: 'D0',
      material_type: materialType,
      primary_material_type: materialType,
      secondary_material_types: [],
      is_mixed_material: false,
      material_components: [],
      maturity_level: 'D0',
      material_summary: materialSummary,
      story_core: '',
      strengths: [],
      main_problems: [message],
      priority_revisions: suggestions,
      next_step: {
        label: '补充材料',
        detail: nextStep,
        summary: nextStep,
        action: nextStep
      },
      conversion_advice: {
        status: 'not_applicable',
        message: '当前阶段不适合项目转化判断。'
      },
      rejection_reason: {
        code,
        message
      },
      suggestions,
      nextStep
    },
    diagnostics: {
      source: 'v1-gatekeeper',
      usesAi: false,
      rejectionCode: code,
      ...diagnostics
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
    materialForm: normalizeString(value.materialForm || value.material_form),
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

function analyzeLowMaturity(text, materialHint) {
  const signals = {
    protagonist: hasAny(text, PROTAGONIST_PATTERNS),
    goal: hasAny(text, GOAL_PATTERNS),
    conflict: hasAny(text, CONFLICT_PATTERNS),
    event: hasAny(text, EVENT_PATTERNS),
    outcome: hasAny(text, OUTCOME_PATTERNS),
    unstableProtagonist: /主角.{0,16}(可能|也许|或|或者|也可能)|可能是.{1,24}(或|或者|也可能)/.test(text),
    explicitlyUnformed: /(尚未|还没|没有|未).{0,10}(成型|形成|确定|完整)|故事尚未成型|还不是完整故事/.test(text),
    conceptLanguage: /概念|设定|点子|想法|世界观|象征|隐喻|主题/.test(text)
  };

  const primaryType = materialHint.primary_material_type || materialHint.material_type || materialHint.materialForm || '';
  const conceptHint = primaryType === 'idea_concept' || primaryType === 'concept';
  const storySignalCount = ['protagonist', 'goal', 'conflict', 'event', 'outcome']
    .filter((key) => signals[key]).length;

  if ((signals.unstableProtagonist || signals.explicitlyUnformed) && (signals.conceptLanguage || conceptHint)) {
    return {
      isLowMaturity: true,
      reason: 'unstable_protagonist_or_unformed_concept',
      materialSummary: '材料包含故事概念或世界规则，但主角身份、事件链或成型程度仍不稳定。',
      signals
    };
  }

  if ((signals.conceptLanguage || conceptHint) && storySignalCount < 4) {
    return {
      isLowMaturity: true,
      reason: 'concept_fragment_missing_story_chain',
      materialSummary: '材料更接近概念或设定片段，缺少足够的人物目标、阻碍、事件链或变化方向。',
      signals
    };
  }

  return { isLowMaturity: false, reason: '', signals };
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}
