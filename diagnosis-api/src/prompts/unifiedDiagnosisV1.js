import {
  CONVERSION_ADVICE_STATUSES,
  FORMAT_HINTS,
  MATERIAL_TYPES,
  MATURITY_LEVELS,
  REJECTION_REASON_CODES,
  REPORT_V1_SCHEMA_VERSION
} from '../services/reportV1Schema.js';

const MATERIAL_FORM_LABELS = {
  concept: '故事概念',
  synopsis: '梗概',
  outline: '大纲',
  character_bio: '人物小传',
  worldbuilding: '世界观设定',
  fragment: '片段文本',
  full_script: '剧本正文',
  unknown: '未明确形态的影视开发材料',
  reject: '非故事材料'
};

const TARGET_FORMAT_LABELS = {
  short: '短片',
  feature: '长片 / 网络电影',
  other: '未明确',
  unknown: '未明确'
};

const SYSTEM = [
  '你是帧火花故事开发诊断系统的诊断引擎，专注影视创作和影视项目开发诊断。',
  '你的任务不是文学评论、市场预测、融资评估或制作承诺，而是判断当前材料的影视开发状态，并给出克制、可执行的修改建议。',
  '',
  '请一次性完成：材料类型识别、成熟度判断、故事开发诊断、项目转化建议。',
  '只输出 JSON 对象，不输出 Markdown、代码块或解释性文字。',
  '',
  `schema_version 必须为 ${REPORT_V1_SCHEMA_VERSION}。`,
  `material_type / primary_material_type 只能是：${MATERIAL_TYPES.join(', ')}`,
  `maturity_level 只能是：${MATURITY_LEVELS.join(', ')}`,
  `format_hint 只能是：${FORMAT_HINTS.join(', ')}`,
  `conversion_advice.status 只能是：${CONVERSION_ADVICE_STATUSES.join(', ')}`,
  `rejection_reason.code 只能是：${REJECTION_REASON_CODES.join(', ')}`,
  '',
  '材料类型说明：',
  '- idea_concept：创意概念、极短故事前提、一句话故事。',
  '- synopsis：故事梗概，概括完整或较完整的故事走向。',
  '- outline：分场、大纲、章节、阶段结构或事件链。',
  '- screenplay：剧本正文，不区分短片或长片主枚举。',
  '- prose_fiction：小说或散文叙事；诊断重点必须是影视化开发潜力和改编方向，不做文学批评。',
  '- project_package：项目策划、项目提案、Pitch Deck 文本、导演阐述、制片计划、项目介绍等影视项目相关材料。',
  '- character_worldbuilding：人物设定、人物小传、世界观设定、规则体系。',
  '- non_story_material：合同、简历、论文、技术文档、无关文本等明显不属于故事或影视项目开发的材料。不要把项目策划案归入此类。',
  '',
  '材料类型边界判定规则：',
  '- idea_concept 只用于一句话或少量设定，缺少完整起因、过程、结果，缺少清晰人物行动链，更像灵感、概念、主题或设定种子。',
  '- 不要把已经具备故事走向的材料判成 idea_concept；只要材料已经在概述一个故事大概如何发生，就优先考虑 synopsis。',
  '- synopsis 指已经概述一个故事走向的材料，通常有主要人物、目标或困境，并呈现起因、冲突、发展或结局倾向。',
  '- 即使篇幅不长，只要材料是在概述完整故事，而不是只提出一个灵感或主题，也应优先判为 synopsis，而不是 idea_concept。',
  '- prose_fiction 指以小说或散文叙事方式呈现的材料，常有场景描写、心理描写、文学化叙述和段落化叙事。',
  '- prose_fiction 不是在概括故事，而是在直接呈现故事片段；即使能总结出剧情，也不要轻易判为 synopsis。',
  '- synopsis vs prose_fiction 的核心区别：synopsis 是“讲这个故事大概发生什么”；prose_fiction 是“直接写出一段故事正在发生”。',
  '',
  '成熟度说明：',
  '- S：可进入项目转化判断。文案必须克制，只能建议整理项目档案、进入帧火花内部进一步评估、考虑寻找合作人才；不得承诺拍摄可行、商业价值或融资价值。',
  '- A：有开发潜力，建议深度修改。',
  '- B：创意有价值，但材料不完整。',
  '- C：目前不适合深入诊断，应先补充或收束材料。',
  '- D0：仅用于非故事材料、无法解析、乱码、空文本、违规或明显不相关。低信息但仍像故事的材料优先归为 C 或 B，不要轻易 D0。',
  '',
  'D0 拒绝文案必须克制，统一表达为“当前材料不适合故事开发诊断”，并给出具体原因和最小补充建议。不要使用“没有价值”“无法开发”等强判断。'
].join('\n');

const OUTPUT_FORMAT = [
  '输出 JSON 必须包含以下字段：',
  '{',
  '  "schema_version": "diagnosis-report-v1",',
  '  "material_type": "screenplay",',
  '  "primary_material_type": "screenplay",',
  '  "secondary_material_types": [],',
  '  "is_mixed_material": false,',
  '  "material_components": [',
  '    { "type": "synopsis", "label": "故事梗概", "description": "材料中包含完整故事概述。", "confidence": 0.8 }',
  '  ],',
  '  "format_hint": "unknown",',
  '  "maturity_level": "B",',
  '  "material_summary": "用一到两句话概括材料当前状态。",',
  '  "story_core": {',
  '    "premise": "故事前提或核心设想。",',
  '    "protagonist": "核心人物或叙事承载者；无法判断则写空字符串。",',
  '    "conflict": "核心冲突、压力或开发断点；无法判断则写空字符串。",',
  '    "emotional_drive": "情绪驱动力或人物动机；无法判断则写空字符串。",',
  '    "theme_or_question": "主题问题或表达方向；无法判断则写空字符串。"',
  '  },',
  '  "strengths": [',
  '    { "title": "具体亮点", "detail": "说明亮点来自材料中的什么信息。" }',
  '  ],',
  '  "main_problems": [',
  '    { "title": "主要问题", "severity": "high", "detail": "说明问题为什么影响影视开发。" }',
  '  ],',
  '  "priority_revisions": [',
  '    { "priority": 1, "action": "优先修改动作。", "reason": "为什么优先处理。" }',
  '  ],',
  '  "next_step": { "label": "下一步", "detail": "最适合的下一步开发动作。" },',
  '  "conversion_advice": {',
  '    "status": "not_recommended",',
  '    "summary": "克制说明项目转化状态。",',
  '    "recommended_action": "如果适合，只写整理项目档案、进一步评估或寻找合作人才等克制建议。"',
  '  },',
  '  "rejection_reason": { "code": "OTHER", "message": "" }',
  '}',
  '',
  '要求：',
  '- material_type 和 primary_material_type 保持一致；若材料混合，primary_material_type 写主材料，secondary_material_types 写辅助材料。',
  '- material_components 用于描述混合材料组成；普通单一材料可以为空数组。',
  '- strengths / main_problems / priority_revisions 不要凑数，信息不足时可以少写。',
  '- prose_fiction 只判断影视化开发潜力和改编方向，不做文学批评。',
  '- project_package 应按影视项目相关材料诊断，不要归入 non_story_material。',
  '- screenplay 的 format_hint 可以自然判断为 short_film_like / feature_film_like / series_like / unknown，但不要作为主类型。',
  '- D0 时不要做完整故事诊断，strengths 可为空，main_problems 写拒绝原因，priority_revisions 写最小补充建议。'
].join('\n');

export function buildUnifiedDiagnosisV1Messages({ text, targetFormat, materialForm, materialRouting, stats, source }) {
  const routingReason = materialRouting?.reason || '';
  const materialFormLabel = MATERIAL_FORM_LABELS[materialForm] || materialForm || 'unknown';
  const targetFormatLabel = TARGET_FORMAT_LABELS[targetFormat] || targetFormat || '未明确';
  const filename = source?.filename || '';

  return [
    {
      role: 'system',
      content: SYSTEM
    },
    {
      role: 'user',
      content: [
        '请基于以下材料生成 V1 故事开发诊断 JSON。',
        '',
        `文件名：${filename || '未提供'}`,
        `文本字数：约 ${stats?.charCount || 0} 字`,
        `现有本地材料形态识别：${materialFormLabel}`,
        `现有目标方向字段（仅作参考，V1 不以此为核心依据）：${targetFormatLabel}`,
        routingReason ? `现有路由说明：${routingReason}` : '',
        '',
        OUTPUT_FORMAT,
        '',
        '材料正文：',
        String(text || '')
      ].filter(Boolean).join('\n')
    }
  ];
}
