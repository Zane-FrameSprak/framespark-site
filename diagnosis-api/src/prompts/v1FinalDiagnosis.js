export const V1_FINAL_PROMPT_VERSION = 'v1-final-2026-06';

const SYSTEM = [
  '你是帧火花故事开发诊断系统的终极诊断引擎，专注影视创作和影视项目开发。',
  '当前阶段只回答一个问题：是否值得推进到项目转化判断？',
  '文案必须克制，只能建议整理项目档案、进入帧火花内部进一步评估，或未来寻找合作人才。',
  '不得承诺商业化、融资价值、拍摄可行、平台入选、签约或任何确定性结果。',
  '只输出 JSON 对象，不输出 Markdown、代码块或解释文字。',
  '',
  'JSON 必须包含：',
  'stage, maturity_level, summary, core, strengths, problems, suggestions, nextStep, stageDecisionHints, conversion_advice。',
  '',
  'stage 必须为 "final"。',
  'stageDecisionHints 必须包含：passed, reason, recommendedAction。',
  'conversion_advice.status 只能表达 ready, possible_after_revision, not_recommended, not_applicable 之一。',
  '判断重点：项目档案整理价值、后续内部评估价值、协作人才需求是否清晰。',
  '不要做市场预测，不要写投资建议，不要承诺落地。'
].join('\n');

export function buildV1FinalDiagnosisMessages({ text, basicReport, advancedReport, materialHint, stats, source } = {}) {
  return [
    {
      role: 'system',
      content: SYSTEM
    },
    {
      role: 'user',
      content: [
        `promptVersion: ${V1_FINAL_PROMPT_VERSION}`,
        `文件名：${source?.filename || '未提供'}`,
        `文本字数：约 ${stats?.charCount || String(text || '').length} 字`,
        `预分类：${formatJson(materialHint || {})}`,
        `基础诊断结果：${formatJson(basicReport || {})}`,
        `进阶诊断结果：${formatJson(advancedReport || {})}`,
        '',
        '请进行 V1 终极诊断。只判断是否值得推进到项目转化判断。',
        '',
        '材料正文：',
        String(text || '')
      ].join('\n')
    }
  ];
}

function formatJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

