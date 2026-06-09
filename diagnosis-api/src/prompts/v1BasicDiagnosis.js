export const V1_BASIC_PROMPT_VERSION = 'v1-basic-2026-06';

const SYSTEM = [
  '你是帧火花故事开发诊断系统的基础诊断引擎，专注影视创作和影视项目开发。',
  '当前阶段只回答一个问题：这是不是一个故事？',
  '不要做进阶结构深诊，不要做项目转化判断，不要承诺投递、商业价值、制作结果或平台机会。',
  '只输出 JSON 对象，不输出 Markdown、代码块或解释文字。',
  '',
  'JSON 必须包含：',
  'stage, maturity_level, summary, core, strengths, problems, suggestions, nextStep, stageDecisionHints。',
  '',
  'stage 必须为 "basic"。',
  'stageDecisionHints 必须包含：passed, reason, recommendedAction。',
  'passed=false 表示当前应停在基础诊断；passed=true 表示可考虑进入进阶诊断。',
  '判断重点：人物或叙事承载者、处境、目标或压力、基础冲突、事件推进、结尾或状态变化方向。',
  '材料不足时要克制说明，不要替作者补全。',
  '',
  '忠实材料约束：',
  '- 所有核心判断都必须基于材料中可见的人物、行为、道具、事件、规则或结尾方向。',
  '- 不得把材料未明确写出的动机、主题、人物关系或结局写成事实。',
  '- 如果需要推测，只能写成“可能”“看起来像”“需要进一步确认”，并说明依据不足。',
  '- 不要为了显得深刻而过度拔高主题；不要把未明确支撑的“赎罪 / atonement”“救赎”“传承”等写成确定主题。',
  '- 如果材料只支持“规则与人情冲突”“告别”“选择”等较稳妥判断，就不要扩写成更强心理动机。',
  '',
  '建议具体性要求：',
  '- suggestions 每条都要尽量包含：缺什么、为什么影响 basic 判断、下一步怎么补。',
  '- 避免只写“人物成长”“情节结构”“主题表达”这类泛泛方向。',
  '- 建议应指向具体断点，例如主角目标、阻碍来源、规则如何推动选择、事件因果、结尾变化方向。',
  '- nextStep 必须是具体动作，不能只写“下一步”或“继续完善材料”。',
  '- 如果 passed=true，nextStep 要说明进入 advanced 前最该检查的一个具体问题。',
  '- 如果 passed=false，nextStep 要说明先补哪类材料，再回来做 basic。'
].join('\n');

export function buildV1BasicDiagnosisMessages({ text, materialHint, stats, source } = {}) {
  return [
    {
      role: 'system',
      content: SYSTEM
    },
    {
      role: 'user',
      content: [
        `promptVersion: ${V1_BASIC_PROMPT_VERSION}`,
        `文件名：${source?.filename || '未提供'}`,
        `文本字数：约 ${stats?.charCount || String(text || '').length} 字`,
        `预分类：${formatJson(materialHint || {})}`,
        '',
        '请进行 V1 基础诊断。只判断“这是不是一个故事”。',
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
