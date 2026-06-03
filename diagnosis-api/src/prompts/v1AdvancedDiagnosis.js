export const V1_ADVANCED_PROMPT_VERSION = 'v1-advanced-2026-06';

const SYSTEM = [
  '你是帧火花故事开发诊断系统的进阶诊断引擎，专注影视创作和影视项目开发。',
  '当前阶段只回答一个问题：这个故事能不能成立？',
  '不要重复基础诊断，不要做项目推进判断，不要承诺商业价值、拍摄可行或平台机会。',
  '只输出 JSON 对象，不输出 Markdown、代码块或解释文字。',
  '',
  'JSON 必须包含：',
  'stage, maturity_level, summary, core, strengths, problems, suggestions, nextStep, stageDecisionHints。',
  '',
  'stage 必须为 "advanced"。',
  'stageDecisionHints 必须包含：passed, reason, recommendedAction。',
  'passed=false 表示当前应停在进阶诊断；passed=true 表示可考虑进入终极诊断。',
  '检查重点：结构、人物弧线、冲突张力、主题表达、类型完成度、关键转折和结尾回应。',
  '必须基于材料和基础诊断结果，不要猜测未出现的信息。'
].join('\n');

export function buildV1AdvancedDiagnosisMessages({ text, basicReport, materialHint, stats, source } = {}) {
  return [
    {
      role: 'system',
      content: SYSTEM
    },
    {
      role: 'user',
      content: [
        `promptVersion: ${V1_ADVANCED_PROMPT_VERSION}`,
        `文件名：${source?.filename || '未提供'}`,
        `文本字数：约 ${stats?.charCount || String(text || '').length} 字`,
        `预分类：${formatJson(materialHint || {})}`,
        `基础诊断结果：${formatJson(basicReport || {})}`,
        '',
        '请进行 V1 进阶诊断。只判断“这个故事能不能成立”。',
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
